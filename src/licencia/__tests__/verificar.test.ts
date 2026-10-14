import assert from 'node:assert/strict';
import { test } from 'node:test';
import { b64uADecodificar, utf8ATexto, verificarLicencia, verificarTope } from '../verificar.ts';

// Los tokens los genera el MISMO código que usa el servidor (Web Crypto de Node),
// no la librería de la app: así se prueba la compatibilidad real entre ambos.
const enc = new TextEncoder();
const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');

async function firmador(kid: string) {
  const par = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
  const firmar = async (payload: unknown) => {
    const bytes = enc.encode(JSON.stringify(payload));
    const firma = new Uint8Array(await crypto.subtle.sign('Ed25519', par.privateKey, bytes));
    return `${b64u(bytes)}.${b64u(firma)}`;
  };
  return { claves: { [kid]: pub }, firmar };
}

const LIC = {
  v: 1,
  kid: 'k1',
  whatsapp: '5491155550000',
  equipo: 'aaaaaaaaaaaaaaaa',
  plan: 'trial',
  inicio: '2026-10-13T12:00:00.000Z',
  vence: '2026-11-12T12:00:00.000Z',
  gracia_hasta: '2026-11-15T12:00:00.000Z',
  emitida: '2026-10-13T12:00:00.000Z',
  offline_hasta: '2026-10-28T12:00:00.000Z',
};

test('una licencia firmada por el servidor verifica en la app', async () => {
  const { claves, firmar } = await firmador('k1');
  const lic = verificarLicencia(await firmar(LIC), claves);
  assert.ok(lic);
  assert.ok(lic !== null);
  assert.equal(lic.equipo, 'aaaaaaaaaaaaaaaa');
  assert.equal(lic.plan, 'trial');
});

test('acepta caracteres no ASCII dentro del payload firmado', async () => {
  const { claves, firmar } = await firmador('k1');
  const lic = verificarLicencia(await firmar({ ...LIC, nota: 'ñandú ✓ 🚗' }), claves);
  assert.ok(lic);
});

test('VIP: vence y gracia_hasta nulos son válidos', async () => {
  const { claves, firmar } = await firmador('k1');
  const lic = verificarLicencia(await firmar({ ...LIC, plan: 'vip', vence: null, gracia_hasta: null }), claves);
  assert.ok(lic !== null);
  assert.equal(lic.vence, null);
});

test('rechaza: payload alterado, firma ajena, kid desconocido y basura', async () => {
  const a = await firmador('k1');
  const b = await firmador('k1');
  const token = await a.firmar(LIC);
  const [, firma] = token.split('.');

  const alterado = b64u(enc.encode(JSON.stringify({ ...LIC, plan: 'vip', vence: null, gracia_hasta: null })));
  assert.equal(verificarLicencia(`${alterado}.${firma}`, a.claves), null, 'payload cambiado');
  assert.equal(verificarLicencia(token, b.claves), null, 'clave pública equivocada');
  assert.equal(verificarLicencia(await a.firmar({ ...LIC, kid: 'k9' }), a.claves), null, 'kid desconocido');
  for (const basura of ['', 'x', 'a.b', 'a.b.c', null, undefined, 42, {}]) {
    assert.equal(verificarLicencia(basura, a.claves), null, `basura: ${String(basura)}`);
  }
});

test('rechaza licencias mal armadas aunque estén bien firmadas', async () => {
  const { claves, firmar } = await firmador('k1');
  assert.equal(verificarLicencia(await firmar({ ...LIC, plan: 'gratis' }), claves), null, 'plan inválido');
  assert.equal(verificarLicencia(await firmar({ ...LIC, vence: 'mañana' }), claves), null, 'fecha inválida');
  assert.equal(verificarLicencia(await firmar({ ...LIC, gracia_hasta: null }), claves), null, 'vence sin gracia');
  assert.equal(verificarLicencia(await firmar({ ...LIC, v: 2 }), claves), null, 'versión desconocida');
  assert.equal(verificarLicencia(await firmar({ ...LIC, equipo: 7 }), claves), null, 'equipo no es texto');
});

test('rotación de claves: acepta varias, cada token con la suya', async () => {
  const a = await firmador('k1');
  const b = await firmador('k2');
  const claves = { ...a.claves, ...b.claves };
  assert.ok(verificarLicencia(await a.firmar(LIC), claves));
  assert.ok(verificarLicencia(await b.firmar({ ...LIC, kid: 'k2' }), claves));
  assert.equal(verificarLicencia(await b.firmar(LIC), claves), null, 'dice k1 pero firmó k2');
});

test('tope firmado: verifica y un token de licencia no sirve como tope', async () => {
  const { claves, firmar } = await firmador('k1');
  const tope = verificarTope(await firmar({ v: 1, kid: 'k1', tipo: 'tope', hasta: '2027-01-31T00:00:00.000Z', emitida: '2026-10-13T12:00:00.000Z' }), claves);
  assert.ok(tope !== null);
  assert.equal(tope.hasta, '2027-01-31T00:00:00.000Z');
  assert.equal(verificarTope(await firmar(LIC), claves), null);
});

test('base64url y utf8: casos borde', () => {
  assert.deepEqual(b64uADecodificar('AQID'), Uint8Array.from([1, 2, 3]));
  assert.deepEqual(b64uADecodificar('AQI'), Uint8Array.from([1, 2]));
  assert.equal(b64uADecodificar('A'), null, 'largo imposible');
  assert.equal(b64uADecodificar('AQ+/'), null, 'caracteres de base64 estándar no valen');
  assert.equal(utf8ATexto(Uint8Array.from([0xc3, 0xb1])), 'ñ');
  assert.equal(utf8ATexto(Uint8Array.from([0xf0, 0x9f, 0x9a, 0x97])), '🚗');
  assert.equal(utf8ATexto(Uint8Array.from([0xff])), null, 'byte inválido');
  assert.equal(utf8ATexto(Uint8Array.from([0xc3])), null, 'secuencia truncada');
  assert.equal(utf8ATexto(Uint8Array.from([0xc0, 0x80])), null, 'overlong');
});
