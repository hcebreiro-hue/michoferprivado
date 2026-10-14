#!/usr/bin/env python3
"""Genera la locucion de senda_demo.mp4 con las voces de macOS y la mezcla con el video.
Uso: python3 hacer_voz.py <voz> <salida.mp4>
"""
import array
import os
import subprocess
import sys
import wave

VOZ = sys.argv[1]
SALIDA = sys.argv[2]
VIDEO = os.path.expanduser("~/Desarrollos/Claudia_app/distribucion/senda_demo.mp4")
TMP = "/tmp/voz/" + VOZ.replace(" ", "_")
DURACION_VIDEO = 125.5
HZ = 44100
MAX_ACELERAR = 1.35   # por encima de esto la voz suena apurada: se avisa
VELOCIDAD = 185       # palabras por minuto de base

# (segundo en que aparece el subtitulo, texto hablado)
GUION = [
    (0.2, "Senda."),
    (2, "Primero, el chofer escribe su WhatsApp y acepta el aviso de privacidad."),
    (6, "Toca Activar y la app queda habilitada."),
    (9, "Entra con datos de ejemplo, para probar todo sin riesgo."),
    (12, "Inicio: ingresos, gastos, ganancia neta y lo que te deben del mes."),
    (16, "Viajes: un calendario con los días que tienen viajes, y la lista de clientes."),
    (21, "Tocá un día para ver solo los viajes de esa fecha."),
    (24, "Para cargar un viaje, tocá el más de arriba o el botón Nuevo."),
    (28, "Uno: nombre y teléfono, o elegí un contacto."),
    (31, "Dos: origen y destino. La fecha y la hora se eligen con el calendario."),
    (35, "Tres: precio y kilómetros. Luego, Agendar."),
    (38, "Ahora la app pregunta cómo se cobró: pendiente, cobrado o parcial."),
    (42, "Cobro parcial: adelantó tres mil pesos y la app calcula lo que falta cobrar."),
    (47, "Guardado: aparece Parcial, debe cuatro mil quinientos."),
    (51, "Tocá un viaje para editarlo y, al terminarlo, pasalo a Completado."),
    (55, "Y registrás el cobro del saldo: Cobrado."),
    (58, "Viaje completado y cobrado: ahora aparece el botón Recibo."),
    (62, "El recibo se arma solo y se envía al cliente por WhatsApp."),
    (66, "También podés bloquear un horario, como el almuerzo, para que nadie reserve."),
    (70, "Tarifas: ponés los kilómetros y te da el precio, el fondo de reserva y tu ganancia."),
    (75, "Editar tarifas abre Configuración: perfil, precio por kilómetro y desgaste."),
    (79, "Auto: el odómetro y las barras de mantenimiento, aceite y frenos."),
    (83, "Registrar aceite abre el formulario del service realizado."),
    (87, "Cargás el costo y una nota. Ese gasto también resta de tu ganancia."),
    (91, "Guardado. Abajo, los vencimientos: seguro, VTV y licencia."),
    (95, "Gastos fijos: para sumar uno, tocá Agregar."),
    (98, "Elegís categoría, descripción y monto mensual."),
    (102, "Combustible: tocá Cargar para registrar una carga de nafta."),
    (106, "Litros y precio por litro: la app calcula el total de la carga."),
    (110, "Reportes: ingresos, costos fijos y ganancia neta real, con todo lo cargado."),
    (115, "El fondo de reserva separa un ahorro por kilómetro para el desgaste del auto."),
    (119, "De vuelta en Inicio: todo se actualiza al instante."),
    (122, "¿Querés la app? Pedí tu alta por WhatsApp desde Activar la app."),
]


def correr(*cmd):
    subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def duracion(ruta):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", ruta],
        check=True, capture_output=True, text=True, stdin=subprocess.DEVNULL,
    ).stdout.strip()
    return float(out)


def leer_wav(ruta):
    with wave.open(ruta, "rb") as w:
        assert w.getframerate() == HZ and w.getnchannels() == 1 and w.getsampwidth() == 2
        a = array.array("h")
        a.frombytes(w.readframes(w.getnframes()))
        return a


os.makedirs(TMP, exist_ok=True)
total = int((DURACION_VIDEO + 1) * HZ)
pista = array.array("i", [0]) * total
avisos = []

for i, (inicio, texto) in enumerate(GUION):
    fin = GUION[i + 1][0] - 0.25 if i + 1 < len(GUION) else DURACION_VIDEO - 0.2
    hueco = fin - inicio
    base = os.path.join(TMP, f"{i:02d}")
    correr("say", "-v", VOZ, "-r", str(VELOCIDAD), "-o", base + ".aiff", texto)
    correr("ffmpeg", "-y", "-v", "error", "-i", base + ".aiff", "-ar", str(HZ), "-ac", "1", base + "_a.wav")
    largo = duracion(base + "_a.wav")
    factor = 1.0
    ruta = base + "_a.wav"
    if largo > hueco:
        factor = largo / hueco
        correr("ffmpeg", "-y", "-v", "error", "-i", base + "_a.wav", "-filter:a", f"atempo={factor:.4f}", base + "_b.wav")
        ruta = base + "_b.wav"
        if factor > MAX_ACELERAR:
            avisos.append(f"  [{inicio}s] acelerado x{factor:.2f} (hueco {hueco:.1f}s): {texto}")
    datos = leer_wav(ruta)
    desde = int(inicio * HZ)
    for k, v in enumerate(datos):
        if desde + k < total:
            pista[desde + k] += v

pico = max(max(pista), -min(pista)) or 1
escala = min(1.0, 30000 / pico)
salida_wav = os.path.join(TMP, "locucion.wav")
with wave.open(salida_wav, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(HZ)
    w.writeframes(array.array("h", [int(v * escala) for v in pista]).tobytes())

correr(
    "ffmpeg", "-y", "-v", "error", "-i", VIDEO, "-i", salida_wav,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart", SALIDA,
)
print("OK", SALIDA, f"{duracion(SALIDA):.1f}s")
print("Avisos de velocidad:" if avisos else "Todas las frases entran sin apurar la voz.")
for a in avisos:
    print(a)
