# -*- coding: utf-8 -*-
"""
Ícones do PWA, desenhados em código.

O ornamento é o mesmo do favicon: losango vazado em osso, losango cheio no
acento por dentro. Nada de imagem externa, nada de conversor: são dois
polígonos, e desenhá-los aqui evita uma dependência de sistema (rsvg,
ImageMagick) que quebra em máquina limpa.

O ícone `maskable` reserva 20% de folga em cada lado, que é o que Android
recorta ao aplicar a máscara do sistema. Sem essa folga o losango sai cortado.
"""
from PIL import Image, ImageDraw

VOID = (0x09, 0x09, 0x0B)
BONE = (0xED, 0xED, 0xF0)
RUBRO = (0xD2, 0x20, 0x2C)


def losango(centro, raio):
    x, y = centro
    return [(x, y - raio), (x + raio, y), (x, y + raio), (x - raio, y)]


def desenhar(lado, folga=0.0, caminho="icone.png"):
    im = Image.new("RGB", (lado, lado), VOID)
    d = ImageDraw.Draw(im)
    c = lado / 2
    util = lado * (1 - 2 * folga)
    fora = util * 0.375                       # o losango externo
    dentro = util * 0.156                     # o interno, cheio
    traco = max(2, round(util * 0.0625))      # o fio, na proporção do favicon
    d.polygon(losango((c, c), fora), outline=BONE, width=traco)
    d.polygon(losango((c, c), dentro), fill=RUBRO)
    im.save(caminho, "PNG", optimize=True)
    return caminho


if __name__ == "__main__":
    import os
    destino = os.path.join(os.path.dirname(__file__), "..", "public", "icones")
    os.makedirs(destino, exist_ok=True)
    feitos = [
        desenhar(192, 0.00, os.path.join(destino, "icone-192.png")),
        desenhar(512, 0.00, os.path.join(destino, "icone-512.png")),
        desenhar(512, 0.20, os.path.join(destino, "icone-512-maskable.png")),
        desenhar(180, 0.10, os.path.join(destino, "apple-touch-icon.png")),
    ]
    for f in feitos:
        print("icones ", os.path.basename(f), os.path.getsize(f), "B")
