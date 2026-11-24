import json
import logging
import re
from datetime import date
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from fpdf.fonts import FontFace
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
IMG = HERE / "img"
ASSETS = HERE / "assets"
TMP = IMG / "generated"
OUTPUT = ROOT / "docs" / "user-manual.pdf"
FONTS = Path(r"C:\Windows\Fonts")

COMPANY = "PBtec - Soluções em Automação"
PHONE = "(83) 3224-3080"
DEVELOPERS = ["José Henrique", "Erick Henrique", "Eduardo Vasconcelos"]
VERSION = re.sub(r"^(\d+\.\d+)\.0$", r"\1", json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"])
MONTHS = ("janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
          "novembro", "dezembro")

TEXT, MUTED, FAINT = (31, 35, 40), (89, 99, 110), (101, 109, 118)
BORDER, CARD, LINK = (209, 217, 224), (246, 248, 250), (9, 105, 218)
VIOLET, GREEN, YELLOW, RED = (139, 92, 246), (26, 127, 55), (154, 103, 0), (207, 34, 46)
GRADIENT_START, GRADIENT_END = (34, 211, 238), (139, 92, 246)
DOT_GREEN = (63, 185, 80)
WARNING_BG, WARNING_BORDER = (255, 248, 197), (212, 167, 44)
TIP_BG, TIP_BORDER = (240, 236, 254), (196, 181, 253)

MAIN_MARKERS = {
    "scale": 2,
    "points": [
        (346, 48, "r"), (638, 48, "l"), (2491, 48, "l"), (29, 223, "l"), (29, 331, "l"), (688, 806, "l"),
        (2039, 1577, "l"), (2328, 151, "l"), (58, 1673, "l"), (2002, 1673, "l"), (2851, 1673, "r"),
    ],
}


def prepare_images():
    TMP.mkdir(parents=True, exist_ok=True)
    gradient_bar(TMP / "bar.png")
    annotate(IMG / "main.png", MAIN_MARKERS, TMP / "main.png")
    for name in ("label", "selected", "text", "barcode", "palette", "code", "templates", "issues",
                 "export", "import", "menu"):
        frame(IMG / f"{name}.png", TMP / f"{name}.png")


def gradient_bar(target, width=600, height=24):
    ss = 3
    bar = Image.new("RGBA", (width * ss, height * ss))
    draw = ImageDraw.Draw(bar)
    for x in range(width * ss):
        t = x / (width * ss - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(GRADIENT_START, GRADIENT_END))
        draw.line([(x, 0), (x, height * ss)], fill=color + (255,))
    mask = Image.new("L", bar.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, bar.width - 1, bar.height - 1], height * ss // 2, fill=255)
    bar.putalpha(mask)
    bar.resize((width, height), Image.LANCZOS).save(target)


def frame(source, target, radius=26, color=BORDER):
    img = Image.open(source).convert("RGBA")
    ss = 3
    W, H = img.width * ss, img.height * ss
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius * ss, fill=255)
    mask = mask.resize(img.size, Image.LANCZOS)
    out = Image.new("RGBA", img.size, (255, 255, 255, 0))
    out.paste(img, (0, 0), mask)
    border = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle([1, 1, W - 2, H - 2], radius * ss, outline=color + (255,), width=3 * ss)
    out.alpha_composite(border.resize(img.size, Image.LANCZOS))
    out.save(target)
    return target


def annotate(source, markers, target):
    screen = Image.open(frame(source, target.with_suffix(".tmp.png")))
    ss = 3
    r = round(13 * markers["scale"])
    margin = 2 * r + 10
    img = Image.new("RGBA", (screen.width + 2 * margin, screen.height), (255, 255, 255, 0))
    img.alpha_composite(screen, (margin, 0))
    layer = Image.new("RGBA", (img.width * ss, img.height * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font = ImageFont.truetype(str(FONTS / "segoeuib.ttf"), round(r * ss * 1.15))
    for n, (x, y, side) in enumerate(markers["points"], start=1):
        x += margin + {"l": -(r + 7), "r": r + 7, "c": 0}[side]
        y = min(max(y, r + 4), img.height - r - 4)
        x, y, R = x * ss, y * ss, r * ss
        d.ellipse([x - R - 3 * ss, y - R - 3 * ss, x + R + 3 * ss, y + R + 3 * ss], fill=(255, 255, 255, 255))
        d.ellipse([x - R, y - R, x + R, y + R], fill=VIOLET + (255,))
        d.text((x, y + ss), str(n), font=font, fill=(255, 255, 255, 255), anchor="mm")
    img.alpha_composite(layer.resize(img.size, Image.LANCZOS))
    img.save(target)
    target.with_suffix(".tmp.png").unlink()


def aspect_ratio(path):
    with Image.open(path) as im:
        return im.height / im.width


def icon(name):
    return str(IMG / f"ic_{name}.png")


def shot(name):
    return TMP / f"{name}.png"


class Manual(FPDF):
    def __init__(self):
        super().__init__(format="A4", unit="mm")
        self.set_margins(18, 22, 18)
        self.set_auto_page_break(True, 22)
        for family, style, file in (("Segoe", "", "segoeui.ttf"), ("Segoe", "B", "segoeuib.ttf"),
                                    ("Segoe", "I", "segoeuii.ttf"), ("SegoeSB", "", "seguisb.ttf"),
                                    ("SegoeSB", "B", "segoeuib.ttf"),
                                    ("Mono", "", "consola.ttf")):
            self.add_font(family, style, str(FONTS / file))
        self.set_title("GôndolaPro – Manual do usuário")
        self.set_author("PBtec")
        self.set_creator("PBtec")

    def header(self):
        if self.page_no() == 1:
            return
        self.set_xy(18, 10)
        self.set_font("Mono", size=7.5)
        self.set_char_spacing(1.6)
        self.set_text_color(*MUTED)
        self.cell(0, 4, "GÔNDOLAPRO · MANUAL DO USUÁRIO")
        self.set_char_spacing(0)
        self.image(str(shot("bar")), x=self.w - 18 - 16, y=11.2, w=16)
        self.set_y(22)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        self.line(18, self.h - 16, self.w - 18, self.h - 16)
        self.image(str(ASSETS / "pbtec-logo.png"), x=18, y=self.h - 13.5, h=8)
        self.set_xy(30, self.h - 11.5)
        self.set_font("Segoe", size=8)
        self.set_text_color(*FAINT)
        self.cell(80, 4, "PBtec · soluções em automação")
        self.set_xy(self.w - 18 - 60, self.h - 11.5)
        self.cell(60, 4, f"Página {self.page_no()}", align="R")

    @property
    def content_width(self):
        return self.w - self.l_margin - self.r_margin

    def space(self, mm):
        self.set_y(self.get_y() + mm)

    def ensure_space(self, mm):
        if self.get_y() + mm > self.page_break_trigger:
            self.add_page()

    def section(self, number, icon_name, title, subtitle=None):
        self.ensure_space(30)
        self.set_font("Mono", size=8)
        self.set_char_spacing(1.6)
        self.set_text_color(*MUTED)
        self.cell(0, 4, f"PASSO {number:02d}" if isinstance(number, int) else number,
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_char_spacing(0)
        self.space(1.5)
        y = self.get_y()
        self.image(icon(icon_name), x=self.l_margin, y=y + 0.8, w=6.5)
        self.set_xy(self.l_margin + 9, y)
        self.set_font("Segoe", "B", 18)
        self.set_text_color(*TEXT)
        self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if subtitle:
            self.set_font("Segoe", size=10.5)
            self.set_text_color(*MUTED)
            self.multi_cell(0, 5.4, subtitle, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.space(1.5)
        self.image(str(shot("bar")), x=self.l_margin, y=self.get_y(), w=14)
        self.space(6)

    def paragraph(self, text, color=TEXT, size=10.5, width=0, x=None):
        self.set_font("Segoe", size=size)
        self.set_text_color(*color)
        if x is not None:
            self.set_x(x)
        self.multi_cell(width, 5.6, text, markdown=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.space(2.5)

    def subtitle(self, text, x=None):
        self.ensure_space(16)
        self.set_font("SegoeSB", size=12)
        self.set_text_color(*TEXT)
        if x is not None:
            self.set_x(x)
        self.cell(0, 7, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.space(1.5)

    def number_badge(self, x, y, number, d=6.2, color=VIOLET, size=9.5):
        self.set_fill_color(*color)
        self.ellipse(x, y, d, d, style="F")
        self.set_font("Segoe", "B", size)
        self.set_text_color(255, 255, 255)
        self.set_xy(x, y + 0.1)
        self.cell(d, d, str(number), align="C")

    def steps(self, items, x=None, width=None, d=6.2):
        x = self.l_margin if x is None else x
        width = width or (self.w - self.r_margin - x)
        for i, text in enumerate(items, start=1):
            self.ensure_space(12)
            y = self.get_y()
            self.number_badge(x, y, i, d)
            self.set_font("Segoe", size=10.5)
            self.set_text_color(*TEXT)
            self.set_xy(x + d + 3.5, y + 0.4)
            self.multi_cell(width - d - 3.5, 5.6, text, markdown=True, align="L",
                            new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_y(max(self.get_y(), y + d) + 2.2)

    def bullets(self, items, x=None, width=None, size=10.5):
        x = self.l_margin if x is None else x
        width = width or (self.w - self.r_margin - x)
        for text in items:
            self.ensure_space(10)
            y = self.get_y()
            self.set_fill_color(*VIOLET)
            self.ellipse(x + 0.6, y + 2.1, 1.7, 1.7, style="F")
            self.set_font("Segoe", size=size)
            self.set_text_color(*TEXT)
            self.set_xy(x + 5, y)
            self.multi_cell(width - 5, 5.6, text, markdown=True, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.space(1.6)

    def table_rows(self, widths, rows, bold_first_column=True, first_column_colors=None, padding=(1.8, 2.6),
                   first_column_family="SegoeSB"):
        self.set_font("Segoe", size=9.5)
        self.set_text_color(*TEXT)
        self.set_fill_color(255, 255, 255)
        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        with self.table(col_widths=widths, line_height=5.6, padding=padding, markdown=True,
                        headings_style=FontFace(family="SegoeSB", color=LINK, fill_color=CARD, size_pt=9.5),
                        cell_fill_mode="NONE", text_align="LEFT") as t:
            for i, row in enumerate(rows):
                r = t.row()
                for j, value in enumerate(row):
                    style = None
                    if i and j == 0 and bold_first_column:
                        color = first_column_colors[i - 1] if first_column_colors else MUTED
                        style = FontFace(family=first_column_family, color=color, size_pt=9.5)
                    r.cell(value, style=style)
        self.space(4)

    def callout(self, title, text, kind="tip", x=None, width=None):
        background, border, title_color = ((WARNING_BG, WARNING_BORDER, YELLOW) if kind == "warning"
                                           else (TIP_BG, TIP_BORDER, (109, 40, 217)))
        x = self.l_margin if x is None else x
        width = width or (self.w - self.r_margin - x)
        inner_width = width - 10
        self.set_font("Segoe", size=10)
        lines = self.multi_cell(inner_width, 5.3, text, markdown=True, align="L", dry_run=True, output="LINES")
        height = 7 + 6 + len(lines) * 5.3 + 3
        self.ensure_space(height + 4)
        y = self.get_y()
        self.set_fill_color(*background)
        self.set_draw_color(*border)
        self.set_line_width(0.3)
        self.rect(x, y, width, height, style="DF", round_corners=True, corner_radius=3)
        self.set_xy(x + 5, y + 4)
        self.set_font("SegoeSB", size=10.5)
        self.set_text_color(*title_color)
        self.cell(0, 6, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(x + 5)
        self.set_font("Segoe", size=10)
        self.set_text_color(*TEXT)
        self.multi_cell(inner_width, 5.3, text, markdown=True, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_y(y + height + 5)

    def figure(self, path, width, caption=None, x=None):
        height = width * aspect_ratio(path)
        self.ensure_space(height + (8 if caption else 2))
        x = self.l_margin + (self.content_width - width) / 2 if x is None else x
        y = self.get_y()
        self.image(str(path), x=x, y=y, w=width)
        self.set_y(y + height + 2)
        if caption:
            self.set_font("Segoe", "I", 8.5)
            self.set_text_color(*FAINT)
            self.cell(0, 4, caption, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.space(4)

    def side_figure(self, path, width, render, gap=7):
        height = width * aspect_ratio(path)
        self.ensure_space(min(height, 120) + 4)
        y = self.get_y()
        self.image(str(path), x=self.l_margin, y=y, w=width)
        x = self.l_margin + width + gap
        self.set_y(y)
        render(x, self.w - self.r_margin - x)
        self.set_y(max(self.get_y(), y + height) + 5)

    def tree(self, entries, name_width=82):
        height = 8 + len(entries) * 8
        self.ensure_space(height + 4)
        x, y = self.l_margin, self.get_y()
        self.set_fill_color(*CARD)
        self.set_draw_color(*BORDER)
        self.set_line_width(0.3)
        self.rect(x, y, self.content_width, height, style="DF", round_corners=True, corner_radius=4)
        for i, (level, icon_name, name, note) in enumerate(entries):
            indent = level * 8
            yy = y + 5 + i * 8
            if level:
                self.set_draw_color(*BORDER)
                self.line(x + 0.5 + indent, yy - 4.5, x + 0.5 + indent, yy + 2.6)
                self.line(x + 0.5 + indent, yy + 2.6, x + 4 + indent, yy + 2.6)
            self.image(icon(icon_name), x=x + 6 + indent, y=yy, w=5)
            self.set_xy(x + 13 + indent, yy)
            self.set_font("Mono", size=9.5)
            self.set_text_color(*TEXT)
            self.cell(name_width - indent, 5, name)
            self.set_font("Segoe", size=9.5)
            self.set_text_color(*FAINT)
            self.cell(0, 5, note)
        self.set_y(y + height + 4)

    def feature_card(self, x, y, w, h, icon_name, title, description):
        self.set_fill_color(*CARD)
        self.set_draw_color(*BORDER)
        self.set_line_width(0.3)
        self.rect(x, y, w, h, style="DF", round_corners=True, corner_radius=4)
        self.image(icon(icon_name), x=x + 6, y=y + 6, w=7)
        self.set_xy(x + 6, y + 16)
        self.set_font("SegoeSB", size=11.5)
        self.set_text_color(*LINK)
        self.multi_cell(w - 12, 5.5, title, align="L")
        self.set_xy(x + 6, self.get_y() + 1.5)
        self.set_font("Segoe", size=9.5)
        self.set_text_color(*MUTED)
        self.multi_cell(w - 12, 5, description, align="L")


def cover(pdf):
    pdf.add_page()
    pdf.image(str(ASSETS / "pbtec-logo.png"), x=18, y=22, h=30)
    y = 92
    pdf.set_xy(18, y)
    pdf.set_font("Mono", size=10)
    pdf.set_char_spacing(2.4)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, "MANUAL DO USUÁRIO")
    pdf.set_char_spacing(0)
    pdf.set_xy(16.5, y + 8)
    pdf.set_font("Segoe", "B", 46)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 20, "GôndolaPro")
    pdf.set_xy(18, y + 31)
    pdf.set_font("Segoe", size=15)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(160, 7.5, "Etiquetas de gôndola para o SysPDV, montadas na tela.")
    pdf.image(str(shot("bar")), x=18, y=y + 51, w=22)
    pdf.set_fill_color(*DOT_GREEN)
    pdf.ellipse(45, y + 49.9, 2.6, 2.6, style="F")
    pdf.set_xy(50, y + 48.7)
    pdf.set_font("Segoe", size=10)
    pdf.set_text_color(*FAINT)
    pdf.cell(0, 5, "Criação, teste e exportação de layouts de etiqueta")

    y = 172
    gap = 6
    w = (pdf.content_width - 2 * gap) / 3
    cards = [
        ("layers", "Monte na tela",
         "Arraste textos, campos do SysPDV, códigos de barras, linhas e caixas sobre uma prévia em milímetros."),
        ("printer", "Teste antes",
         "A verificação aponta os erros e a impressão de teste sai direto na impressora de etiquetas."),
        ("upload", "Pronto para o SysPDV",
         "Exporte o XML que o SysPDV importa ou copie o código PPLA, EPL ou ZPL."),
    ]
    for i, (icon_name, title, text) in enumerate(cards):
        pdf.feature_card(18 + i * (w + gap), y, w, 58, icon_name, title, text)

    pdf.set_xy(18, 262)
    pdf.set_font("Segoe", size=9)
    pdf.set_text_color(*FAINT)
    today = date.today()
    pdf.cell(0, 5, f"Versão {VERSION} · {MONTHS[today.month - 1]} de {today.year}")
    pdf.set_xy(18, 267)
    pdf.cell(0, 5, f"PBtec · soluções em automação · {PHONE}")


def page_intro(pdf):
    pdf.add_page()
    pdf.section("ANTES DE COMEÇAR", "tag", "O que é o GôndolaPro")
    pdf.paragraph(
        "O SysPDV imprime etiquetas a partir de um **script na linguagem da impressora** (PPLA, EPL ou ZPL), "
        "cadastrado em **Utilitários > Configuração de layouts > Etiqueta**.")
    pdf.paragraph(
        "Esse script é uma sequência de números e comandos difícil de escrever e, como o SysPDV não mostra a "
        "etiqueta na tela, o ajuste costuma ser feito por tentativa e erro: mudar um número, imprimir, conferir, "
        "mudar de novo. No GôndolaPro a etiqueta é montada visualmente:")
    pdf.bullets([
        "**Prévia em milímetros:** a etiqueta aparece na tela do jeito que vai sair, com valores de exemplo no "
        "lugar dos dados do produto.",
        "**Campos do SysPDV prontos:** descrição, preço, código de barras e todas as outras tags da legenda, "
        "organizados e com busca.",
        "**Verificação automática:** avisa sobre elementos fora da etiqueta, tags erradas e códigos EAN "
        "inválidos.",
        "**Funciona com o que já existe:** abre o XML exportado do SysPDV ou o código de um layout pronto, sem "
        "perder nenhum comando.",
    ])
    pdf.space(2)
    pdf.callout("Antes de começar, no SysPDV",
                "A tela de layouts de etiqueta só aparece com o parâmetro **136 - Habilita etiqueta por layout** "
                "ligado (**Sistema > Parâmetro > SysPDV Server**). Tenha em mãos o modelo da impressora de "
                "etiquetas e as medidas da etiqueta.")

    pdf.subtitle("Em resumo")
    pdf.steps([
        "**Configure a etiqueta:** largura, altura, espaço e a linguagem da impressora (Passo 2).",
        "**Monte o layout:** coloque os campos do SysPDV, o código de barras e o preço na prévia.",
        "**Confira:** veja a verificação e, se quiser, imprima uma etiqueta de teste.",
        "**Leve para o SysPDV:** clique em **Exportar XML** ou em **Copiar código**.",
    ])


def page_main(pdf):
    pdf.add_page()
    pdf.section(1, "monitor", "A tela principal", "Tudo é feito nesta tela.")
    pdf.figure(shot("main"), pdf.content_width, "Tela principal do GôndolaPro com o layout de exemplo")
    pdf.steps([
        "**Nome do layout:** clique para renomear. Uma bolinha laranja ao lado indica alterações não salvas.",
        "**Novo, Abrir e Salvar**, e os botões de desfazer e refazer.",
        "**Tema** claro ou escuro, **menu de três pontinhos** (Salvar como, Atalhos do teclado, Sobre) e "
        "**Exportar XML**.",
        "**Inserir:** texto, código de barras, linha e caixa.",
        "**Campos do SysPDV:** as tags da legenda, agrupadas e com busca.",
        "**Prévia da etiqueta:** arraste os elementos para posicioná-los.",
        "**Zoom** da prévia. Ao lado ficam a medida, a linguagem e a resolução.",
        "**Propriedades:** sem nada selecionado, mostra a etiqueta; com um elemento selecionado, mostra as "
        "opções dele.",
        "**Código e verificação:** abre o código gerado e mostra se há problemas no layout.",
        "**Copiar código:** copia o script para colar no SysPDV.",
        "**Impressora e Imprimir teste:** imprime uma etiqueta com os valores de exemplo.",
    ])


def page_label(pdf):
    pdf.add_page()
    pdf.section(2, "sliders", "Configurar a etiqueta",
                "Medidas da etiqueta e a linguagem que a impressora entende.")

    def text(x, width):
        pdf.paragraph("Com nenhum elemento selecionado (clique numa área vazia ou tecle **Esc**), o painel da "
                      "direita mostra a **Etiqueta**:", x=x, width=width)
        pdf.bullets([
            "**Largura** e **Altura:** medidas da etiqueta, em mm.",
            "**Espaço:** distância entre uma etiqueta e a próxima no rolo, em mm.",
            "**Linguagem:** a linguagem da impressora do cliente.",
            "**Resolução:** pontos por polegada da impressora. O mais comum é **203 dpi**.",
        ], x=x, width=width)

    pdf.side_figure(shot("label"), 62, text)
    pdf.paragraph("Para começar um layout do zero, clique em **Novo**. Se houver alterações não salvas, o "
                  "programa pergunta antes de descartá-las.")
    pdf.subtitle("Qual linguagem escolher")
    pdf.table_rows((40, 134), [
        ("Linguagem", "Impressoras mais comuns"),
        ("PPLA", "Argox OS-214, Elgin L42"),
        ("EPL / PPLB", "Zebra TLP 2844 e GC420t, Argox, Elgin, Honeywell"),
        ("ZPL", "Zebra GC420t e S4M, Elgin L42, Honeywell"),
    ], first_column_colors=[LINK, LINK, LINK])
    pdf.callout("Na dúvida sobre a linguagem",
                "Abra o layout que o cliente já usa no SysPDV (Passo 8). O GôndolaPro detecta a linguagem "
                "sozinho.")


def page_elements(pdf):
    pdf.add_page()
    pdf.section(3, "layers", "Adicionar elementos",
                "Tudo o que vai na etiqueta sai do painel da esquerda.")

    def text(x, width):
        pdf.subtitle("Inserir", x=x)
        pdf.bullets([
            "**Texto:** um texto fixo (como \"R$\"), um campo do SysPDV ou os dois juntos.",
            "**Barras:** código de barras, normalmente com o código do produto **</1>**.",
            "**Linha:** uma linha reta, horizontal ou vertical.",
            "**Caixa:** um retângulo com borda.",
        ], x=x, width=width)
        pdf.subtitle("Campos do SysPDV", x=x)
        pdf.paragraph("Ficam agrupados em **Produto**, **Preços**, **Preço referencial**, **Oferta programada**, "
                      "**Estoque e datas** e **Empresa e fornecedor**. Clique no nome do grupo para abrir ou "
                      "fechar.", x=x, width=width)
        pdf.paragraph("Clicar em um campo coloca na etiqueta um texto com a tag dele, por exemplo **</3>** para a "
                      "descrição reduzida. Passe o mouse sobre o campo para ver um valor de exemplo e o tamanho "
                      "máximo.", x=x, width=width)

    pdf.side_figure(shot("palette"), 50, text)

    pdf.subtitle("Buscar um campo")
    pdf.paragraph("Digite em **Buscar campo...** parte do nome ou o número da tag. A busca ignora acentos e mostra os "
                  "campos de todos os grupos que combinam.")
    pdf.callout("Onde o elemento aparece",
                "O elemento novo entra no canto superior esquerdo da etiqueta e já fica selecionado. Arraste-o para "
                "o lugar certo ou digite a posição no painel da direita.")


def page_edit(pdf):
    pdf.add_page()
    pdf.section(4, "move", "Editar os elementos", "Posição, tamanho e conteúdo de cada elemento.")
    pdf.figure(shot("selected"), pdf.content_width, "Preço selecionado na prévia, com as propriedades à direita")
    pdf.bullets([
        "**Selecionar:** clique no elemento na prévia. Ele ganha um contorno azul e o painel da direita mostra as "
        "opções dele.",
        "**Mover:** arraste com o mouse (encaixa a cada 0,5 mm), use as setas do teclado (0,5 mm; com **Shift**, "
        "5 mm) ou digite **Posição X** e **Posição Y**. A posição é medida a partir do canto superior esquerdo "
        "da etiqueta.",
        "**Duplicar** e **Excluir:** botões no fim do painel, ou **Ctrl+D** e **Delete**.",
        "**Voltar para a etiqueta:** o **×** no topo do painel, ou **Esc**.",
        "**Desfazer** e **refazer:** **Ctrl+Z** e **Ctrl+Y**, em qualquer alteração.",
    ])

    pdf.add_page()

    def text_options(x, width):
        pdf.subtitle("Texto", x=x)
        pdf.bullets([
            "**Conteúdo:** pode misturar texto fixo e tags, como \"Validade: </22>\".",
            "**Inserir campo do SysPDV...:** acrescenta uma tag no fim do conteúdo.",
            "**Altura da letra:** em mm. As impressoras só têm alguns tamanhos de fonte, então o programa escolhe "
            "o mais próximo e mostra logo abaixo a **altura real** que vai sair.",
            "**Rotação:** 0°, 90°, 180° ou 270°.",
            "**Valor de exemplo:** o valor que aparece na prévia e no teste no lugar da tag. Troque para testar "
            "descrições longas ou preços grandes.",
        ], x=x, width=width)

    pdf.side_figure(shot("text"), 56, text_options)

    def barcode_options(x, width):
        pdf.subtitle("Código de barras", x=x)
        pdf.bullets([
            "**Conteúdo:** normalmente **</1>**. Use **Trocar pelo campo do SysPDV...** para escolher outro.",
            "**Tipo:** EAN-13 ou 2 de 5 intercalado.",
            "**Altura das barras** (mm) e **Largura do módulo** (pontos da impressora). Quanto maior o módulo, "
            "mais largo o código.",
            "**Imprimir os números abaixo das barras:** liga ou desliga os dígitos.",
        ], x=x, width=width)

    pdf.side_figure(shot("barcode"), 56, barcode_options)

    pdf.ensure_space(48)
    pdf.subtitle("Linha e caixa")
    pdf.bullets([
        "**Linha:** **Largura** e **Altura**. Uma linha horizontal fina é, por exemplo, 100 × 0,3 mm.",
        "**Caixa:** **Largura**, **Altura** e **Espessura** da borda.",
        "**Inverter as cores do que estiver por baixo:** o texto preto embaixo do elemento sai branco. Serve para "
        "uma faixa preta com \"OFERTA\" em branco, por exemplo.",
    ])
    pdf.callout("O código continua com as tags",
                "Os valores de exemplo servem só para a prévia e para a impressão de teste. O que vai para o "
                "SysPDV é sempre a tag, que ele troca pelos dados do produto na hora de imprimir.")
    pdf.subtitle("Comandos sem prévia")
    pdf.paragraph("Ao abrir um layout feito fora do GôndolaPro, as linhas de código que o programa não sabe "
                  "desenhar viram **comandos sem prévia**, listados no painel da esquerda. Eles não aparecem na "
                  "prévia, mas vão para o código exatamente como estavam, na mesma posição.")


def page_check(pdf):
    pdf.add_page()
    pdf.section(5, "check", "Conferir o resultado", "A verificação e o código gerado.")
    pdf.paragraph("A cada alteração o layout é conferido. O resultado aparece na barra de baixo: **Nenhum "
                  "problema** em verde ou a quantidade de problemas em amarelo. Clique nele para ver a lista; "
                  "clicar em um problema seleciona o elemento.")
    pdf.figure(shot("issues"), pdf.content_width,
               "Um texto foi arrastado para fora da etiqueta: ele fica com contorno vermelho e a verificação avisa")
    pdf.subtitle("A verificação avisa quando")
    pdf.bullets([
        "um elemento passa da borda da etiqueta;",
        "um texto ou código de barras está sem conteúdo;",
        "uma tag não existe na legenda do SysPDV, ou precisa de dígitos depois dela e está sem eles "
        "(**</18>**, **</99>**, **</32>**);",
        "um código EAN-13 fixo não tem 12 ou 13 dígitos;",
        "um comando sem prévia é de outra linguagem e ficou fora do código.",
    ])

    pdf.add_page()
    pdf.subtitle("O código gerado")
    pdf.paragraph("O código fica escondido até você clicar em **Código PPLA** (ou EPL, ZPL) na barra de baixo. "
                  "Não é preciso mexer nele: o código é refeito sozinho a cada alteração na prévia.")
    pdf.figure(shot("code"), pdf.content_width, "Código aberto, com a verificação à direita")
    pdf.callout("O que é <STX>?",
                "No PPLA, os comandos de sistema começam com um caractere de controle invisível chamado STX. Na "
                "tela ele aparece escrito como **<STX>**, mas ao copiar ou exportar vai o caractere real, igual "
                "ao que o SysPDV grava.")
    pdf.subtitle("Cabeçalho e rodapé")
    pdf.paragraph("Com o código aberto, o botão **Cabeçalho e rodapé** mostra os comandos que vão antes e depois "
                  "dos elementos (velocidade, temperatura, tamanho da etiqueta e quantidade). O padrão de cada "
                  "linguagem funciona na maioria dos casos; edite só se souber o que está mudando. **Restaurar "
                  "padrão** desfaz a personalização.")
    pdf.figure(shot("templates"), pdf.content_width, "Editor de cabeçalho e rodapé")
    pdf.paragraph("Variáveis aceitas: **{widthDots}**, **{heightDots}** e **{gapDots}** (largura, altura e "
                  "espaço da etiqueta em pontos). A tag **</17>** é a quantidade de etiquetas que o SysPDV vai "
                  "imprimir.", size=10)


def page_print(pdf):
    pdf.add_page()
    pdf.section(6, "printer", "Imprimir um teste",
                "Uma etiqueta de verdade, antes de levar o layout para o SysPDV.")
    pdf.steps([
        "No canto inferior direito, escolha a **impressora de etiquetas** na lista. O programa lembra a última "
        "impressora usada.",
        "Clique em **Imprimir teste**. Sai uma etiqueta com os **valores de exemplo** no lugar das tags.",
        "Compare a etiqueta impressa com a prévia e ajuste o que for preciso.",
    ])
    pdf.callout("Escolha a impressora certa",
                "A impressão de teste manda o código direto para a impressora, sem passar pelo driver do Windows. "
                "Confira se é a impressora de etiquetas e se a linguagem do layout é a dela. Uma impressora comum "
                "(ou o Microsoft Print to PDF) não gera a etiqueta.", "warning")
    pdf.callout("A prévia é aproximada",
                "A largura dos textos é estimada a partir dos valores de exemplo, e os dados reais podem ser mais "
                "longos (veja o tamanho máximo de cada campo na tabela de tags). Teste com valores longos para "
                "garantir que nada passa da borda.")
    pdf.paragraph("A primeira impressão depois de abrir o programa pode levar alguns segundos a mais. As "
                  "seguintes saem rápido.", color=MUTED, size=10)

    pdf.add_page()
    pdf.section(7, "upload", "Levar o layout para o SysPDV", "Há dois caminhos: use o mais prático no cliente.")

    def export(x, width):
        pdf.subtitle("Exportar XML", x=x)
        pdf.steps([
            "Clique em **Exportar XML** (ou **Ctrl+E**).",
            "Informe o **Código** do layout no SysPDV (até 2 letras ou números; **4** vira **04**) e a "
            "**Descrição** (até 40 caracteres).",
            "Clique em **Exportar XML** e escolha onde salvar.",
            "No SysPDV, importe o arquivo na tela **Utilitários > Configuração de layouts > Etiqueta**.",
        ], x=x, width=width)

    pdf.side_figure(shot("export"), 72, export)
    pdf.callout("Cuidado com o código",
                "Se já existir no SysPDV um layout com o mesmo código, confira antes de importar para não "
                "sobrescrever o layout errado. Se a verificação encontrou problemas, o programa avisa, mas gera o "
                "XML mesmo assim.", "warning")
    pdf.subtitle("Copiar código")
    pdf.steps([
        "Clique em **Copiar código**, na barra de baixo.",
        "No SysPDV, abra **Utilitários > Configuração de layouts > Etiqueta**, selecione ou crie o layout e cole "
        "o código.",
        "Salve no SysPDV e imprima a etiqueta de um produto real para conferir.",
    ])
    pdf.callout("Se o XML não for aceito",
                "Se a importação do XML não funcionar na versão do SysPDV do cliente, use **Copiar código**: o "
                "resultado na impressora é o mesmo.")


def page_open(pdf):
    pdf.add_page()
    pdf.section(8, "folder", "Abrir um layout que já existe",
                "Para ajustar o layout que o cliente já usa, sem começar do zero.")
    pdf.paragraph("O botão **Abrir** (ou **Ctrl+O**) aceita estes formatos:")
    pdf.table_rows((58, 116), [
        ("Formato", "O que acontece"),
        ("Layout do GôndolaPro (.etq)", "Abre direto."),
        ("XML exportado do SysPDV", "Traz código, descrição e layout. Se o arquivo tiver vários layouts, você "
                                    "escolhe qual importar."),
        ("Arquivo de código (.txt, .prn, .zpl, .epl)", "Por exemplo, o gerado pelo BarTender ou ZebraDesigner "
                                                       "com \"Imprimir para arquivo\"."),
        ("Código copiado", "Copie o código na tela de layout do SysPDV, clique na prévia do GôndolaPro e tecle "
                           "**Ctrl+V**."),
    ])
    pdf.subtitle("A tela de conferência")
    pdf.paragraph("Tudo o que não é .etq passa pela tela **Importar layout** antes de abrir:")
    pdf.figure(shot("import"), 84, "Conferência de um código ZPL colado")
    pdf.bullets([
        "A **Linguagem** é detectada sozinha (aparece \"detectada\" ao lado). Troque se estiver errada.",
        "O código pode ser corrigido na própria tela antes de importar.",
        "Em EPL e ZPL, **Largura** e **Altura** vêm do próprio código. **Em PPLA não vêm:** confira as medidas "
        "antes de clicar em **Importar**.",
    ])
    pdf.paragraph("**Nada se perde:** o que o GôndolaPro não sabe desenhar vira comando sem prévia e continua no "
                  "código, na mesma posição.")
    pdf.callout("Etiquetas lado a lado",
                "Layouts que imprimem vários produtos lado a lado (com **<corpo>** e **</32>**) podem ser abertos "
                "e editados, mas o GôndolaPro ainda não monta esse formato pelo editor: essas linhas ficam como "
                "comandos sem prévia.", "warning")


def page_save(pdf):
    pdf.add_page()
    pdf.section(9, "save", "Salvar o trabalho", "O arquivo .etq guarda o layout para reaproveitar depois.")
    pdf.bullets([
        "**Salvar** (**Ctrl+S**) grava o layout em um arquivo **.etq**. Na primeira vez o programa pergunta onde "
        "salvar e sugere o nome do layout.",
        "**Salvar como...** (menu de três pontinhos ou **Ctrl+Shift+S**) grava uma cópia com outro nome.",
        "O .etq guarda tudo: medidas, linguagem, elementos, valores de exemplo, cabeçalho e rodapé "
        "personalizados e o código usado na exportação para o SysPDV.",
        "Enquanto houver alterações não salvas, aparece uma bolinha laranja ao lado do nome.",
    ])
    pdf.figure(shot("menu"), 120, "Menu de três pontinhos: Salvar como, Atalhos do teclado e Sobre")
    pdf.subtitle("Sugestão de organização")
    pdf.tree([
        (0, "folder", "C:\\Etiquetas", ""),
        (1, "folder", "Mercado Boa Compra", "uma pasta por cliente"),
        (2, "tag", "Gondola 100x30.etq", "layout salvo pelo GôndolaPro"),
        (2, "document", "Gondola 100x30.xml", "XML exportado para o SysPDV"),
        (1, "folder", "Supermercado Central", "mesma organização"),
    ], name_width=78)
    pdf.callout("Reaproveite layouts",
                "Para outra loja com etiqueta parecida, abra o .etq, ajuste o que mudar e exporte com o código "
                "que essa loja usa no SysPDV.")

    pdf.add_page()
    pdf.section("ATALHOS", "keyboard", "Atalhos do teclado",
                "A mesma lista aparece no programa, em Atalhos do teclado.")
    pdf.table_rows((48, 126), [
        ("Tecla", "Ação"),
        ("Setas", "Move o elemento selecionado 0,5 mm (com **Shift**, 5 mm)"),
        ("Delete", "Exclui o elemento selecionado"),
        ("Ctrl+D", "Duplica o elemento selecionado"),
        ("Esc", "Tira a seleção e volta para a etiqueta"),
        ("Ctrl+Z / Ctrl+Y", "Desfaz / refaz"),
        ("Ctrl+S", "Salva o layout"),
        ("Ctrl+Shift+S", "Salva como"),
        ("Ctrl+O", "Abre um layout (.etq, XML do SysPDV ou código)"),
        ("Ctrl+V", "Importa código de etiqueta copiado (fora de um campo de texto)"),
        ("Ctrl+E", "Exporta o XML para o SysPDV"),
    ], first_column_family="Mono", padding=(1.4, 2.6))
    pdf.paragraph("As teclas de mover, excluir e duplicar não funcionam com o cursor dentro de um campo do "
                  "painel. Clique na prévia antes de usá-las.", color=MUTED, size=10)


def page_tags(pdf):
    pdf.add_page()
    pdf.section("REFERÊNCIA", "code", "Campos (tags) do SysPDV",
                "Na hora de imprimir, o SysPDV troca cada tag pelos dados do produto.")
    rows = [
        ("Tag", "Descrição", "Tam. máx."),
        ("</1>", "Código do produto", "14"),
        ("</2>", "Descrição do produto", "45"),
        ("</3>", "Descrição reduzida do produto", "20"),
        ("</4>", "Seção", "30"),
        ("</5>", "Unidade do produto", "3"),
        ("</6>  </7>  </8>", "Tabela de preço de venda ou oferta 1, 2 e 3", "22"),
        ("</9>  </10>  </11>", "Tabela de preço 1, 2 e 3", "22"),
        ("</12>", "Fornecedor", "40"),
        ("</13>", "Nome fantasia da empresa", "40"),
        ("</14>", "Data em que o sistema se encontra", "4"),
        ("</15>", "Descrição do produto, caracteres 1 a 25", "25"),
        ("</16>", "Descrição do produto, caracteres 26 a 45", "20"),
        ("</17>", "Quantidade de etiquetas impressas do produto", "4"),
        ("</18>XXYY", "Trecho da descrição, do caractere XX ao YY (ex.: </18>0105 = ARROZ)", "45"),
        ("</19>  </20>", "Estoque mínimo / máximo do produto", "10"),
        ("</21>", "Palavra OFERTA", "6"),
        ("</22>", "Data do último reajuste do preço (DDMM)", "4"),
        ("</23>", "Unidade da referência do produto", "5"),
        ("</24>", "Medida de referência do produto", "13"),
        ("</26>  </27>", "Início / fim da oferta programada (DD/MM/AA)", "8"),
        ("</28>", "Preço de oferta do preço programado", "22"),
        ("</29>  </30>", "Quantidade mínima da tabela de preço 2 / 3", "22"),
        ("</33>", "Código auxiliar numérico do produto (principal)", "15"),
        ("</99>XXX", "Caractere pelo código ASCII XXX (ex.: </99>065 = A)", "1"),
        ("</referenciafabricante>", "Código de referência do fabricante", "20"),
        ("</precoreferencial>", "Preço referencial do produto", "-"),
    ]
    pdf.table_rows((50, 104, 20), rows, first_column_colors=[LINK] * (len(rows) - 1), first_column_family="Mono",
                   padding=(1.0, 2.6))


def page_faq(pdf):
    pdf.add_page()
    pdf.section("DÚVIDAS", "question", "Problemas comuns e soluções")
    rows = [
        ("Situação", "O que fazer"),
        ("O preço saiu deslocado para a direita",
         "O SysPDV coloca 2 espaços antes do preço, e a prévia já conta com eles. Se ainda ficar diferente, "
         "aproxime o preço do \"R$\" e faça outro teste."),
        ("A descrição real cortou ou passou da borda",
         "Troque o **Valor de exemplo** por uma descrição do tamanho máximo do campo (45 caracteres para "
         "**</2>**). Se não couber, diminua a letra ou use **</15>** e **</16>** em duas linhas."),
        ("A letra impressa ficou diferente da digitada",
         "PPLA e EPL só têm alguns tamanhos de fonte. Confie na **altura real** mostrada abaixo de **Altura da "
         "letra**."),
        ("Importei um PPLA e o tamanho ficou errado",
         "O PPLA não informa o tamanho da etiqueta. Corrija **Largura**, **Altura** e **Espaço** no painel da "
         "etiqueta."),
        ("Troquei a linguagem e comandos sumiram do código",
         "Comandos sem prévia são da linguagem original e ficam fora do código. Volte para a linguagem original "
         "ou recrie esses comandos na nova."),
        ("A impressão de teste não saiu",
         "Confira se a impressora escolhida é a de etiquetas, se está ligada e se a linguagem do layout é a "
         "dela. Se aparecer erro do Windows, verifique a impressora no Painel de Controle."),
        ("O código de barras aparece em vermelho",
         "Um EAN-13 com número fixo precisa ter 12 ou 13 dígitos. Para o código do produto, deixe **</1>**."),
        ("\"A tag não está na legenda do SysPDV\"",
         "Provavelmente há um erro de digitação. Apague a tag e insira de novo pela lista de campos."),
    ]
    pdf.table_rows((58, 116), rows, padding=(1.4, 2.6))
    pdf.callout("Precisa de ajuda?",
                f"Fale com a **{COMPANY}** pelo telefone **{PHONE}**. Se for um erro, informe o que apareceu na "
                "tela e, se possível, mande o arquivo .etq do layout.")


def credits(pdf):
    pdf.space(2)
    height = max(32, 16 + 8 * len(DEVELOPERS))
    pdf.ensure_space(height + 12)
    pdf.subtitle("Créditos")
    x, y = pdf.l_margin, pdf.get_y()
    pdf.set_fill_color(*CARD)
    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.3)
    pdf.rect(x, y, pdf.content_width, height, style="DF", round_corners=True, corner_radius=4)
    middle = x + pdf.content_width * 0.52

    def line(x0, icon_name, text, yy, family="Segoe", size=10.5):
        pdf.image(icon(icon_name), x=x0, y=yy + 0.2, w=5)
        pdf.set_xy(x0 + 8, yy)
        pdf.set_font(family, size=size)
        pdf.set_text_color(*TEXT)
        pdf.cell(80, 5.5, text)

    line(x + 7, "tag", f"GôndolaPro · versão {VERSION}", y + 6, "SegoeSB", 11)
    line(x + 7, "layers", COMPANY, y + 14)
    line(x + 7, "phone", PHONE, y + 22)
    pdf.set_draw_color(*BORDER)
    pdf.line(middle - 4, y + 6, middle - 4, y + height - 6)
    pdf.set_xy(middle + 2, y + 6)
    pdf.set_font("Mono", size=8)
    pdf.set_char_spacing(1.6)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5.5, "DESENVOLVIMENTO E ANÁLISE")
    pdf.set_char_spacing(0)
    for i, name in enumerate(DEVELOPERS):
        line(middle + 2, "user", name, y + 14 + 8 * i)
    pdf.set_y(y + height + 4)


def main():
    logging.getLogger("fontTools.subset").setLevel(logging.ERROR)
    prepare_images()
    pdf = Manual()
    cover(pdf)
    page_intro(pdf)
    page_main(pdf)
    page_label(pdf)
    page_elements(pdf)
    page_edit(pdf)
    page_check(pdf)
    page_print(pdf)
    page_open(pdf)
    page_save(pdf)
    page_tags(pdf)
    page_faq(pdf)
    credits(pdf)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT))
    print("Manual:", OUTPUT, f"({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
