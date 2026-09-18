from PIL import Image

jpg_file = "test.jpg"
pdf_file = "output.pdf"

image = Image.open(jpg_file)

if image.mode != "RGB":
    image = image.convert("RGB")

image.save(pdf_file, "PDF")

print("변환 완료:", pdf_file)
