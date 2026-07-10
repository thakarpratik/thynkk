from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
APP = ROOT / "app"
SRC = Path(r"C:\Users\thaka\Downloads\thynkk-web\public")

favicon_path = SRC / "Favicon.jpg"
if not favicon_path.exists():
    favicon_path = SRC / "thynkkicon.png"
icon_src = Image.open(favicon_path).convert("RGBA")
logo_src = Image.open(SRC / "ThynkkLogo.png").convert("RGBA")


def crop_to_content(img: Image.Image, pad: int = 16) -> Image.Image:
    """Trim empty margins so the wordmark fills the asset."""
    luminance = img.convert("L")
    bbox = luminance.point(lambda p: 255 if p > 24 else 0).getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


logo_src = crop_to_content(logo_src)

PUBLIC.mkdir(parents=True, exist_ok=True)

ICON_SIZES = [16, 32, 48, 180, 192, 512]
icon_images: list[Image.Image] = []
for size in ICON_SIZES:
    img = icon_src.resize((size, size), Image.Resampling.LANCZOS)
    out = PUBLIC / ("icon.png" if size == 512 else f"icon-{size}.png")
    img.save(out, optimize=True)
    if size in (16, 32, 48):
        icon_images.append(img)

icon_images[0].save(
    APP / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

icon_src.resize((180, 180), Image.Resampling.LANCZOS).save(
    PUBLIC / "apple-touch-icon.png",
    optimize=True,
)


def resize_logo(height: int, name: str) -> tuple[int, int]:
    width = int(logo_src.width * (height / logo_src.height))
    logo_src.resize((width, height), Image.Resampling.LANCZOS).save(
        PUBLIC / name,
        optimize=True,
    )
    return width, height


logo_w, logo_h = resize_logo(56, "thynkk-logo.png")
resize_logo(112, "thynkk-logo@2x.png")
logo_src.resize(
    (logo_src.width // 2, logo_src.height // 2),
    Image.Resampling.LANCZOS,
).save(PUBLIC / "ThynkkLogo.png", optimize=True)

print(f"logo: {logo_w}x{logo_h}")
for path in sorted(PUBLIC.glob("*thynkk*")) + sorted(PUBLIC.glob("icon*")) + sorted(PUBLIC.glob("apple*")):
    print(path.name, path.stat().st_size)
print("favicon.ico", (APP / "favicon.ico").stat().st_size)