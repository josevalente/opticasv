# Óptica V · Probador virtual

Tienda demo de anteojos de **lectura** y de **sol** con un probador de realidad aumentada: la cámara funciona como un espejo de tienda y cada armazón se pone sobre tu rostro a escala real.

## Qué incluye

- **Vitrina** con 18 modelos (8 de lectura y 10 de sol), filtros por tipo y forma, colores y orden por precio.
- **Probador AR** con la cámara frontal, usando [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker):
  - sigue el rostro en tiempo real (posición, inclinación y giro, con la patilla visible al girar),
  - calcula la escala a partir de la distancia interpupilar, así el armazón se ve en su tamaño real (calibre, puente y patilla en mm),
  - detecta el tipo de rostro (ovalado, redondo, cuadrado, alargado o corazón) y recomienda formas,
  - permite tomar fotos y compararlas lado a lado, como frente al vendedor,
  - incluye ajuste fino de tamaño y altura, y una alternativa con foto si no hay cámara.
- **Bolsa y caja simuladas**: graduación de lectura (+1.00 a +3.50), filtro de luz azul, retiro en tienda o despacho, pago simulado y comprobante de demostración. **No se pide ni se cobra ningún medio de pago.**

Todo corre en el navegador: las imágenes de la cámara no salen del dispositivo.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `opticav-probador`).
2. Sube el contenido de esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Probador virtual Óptica V"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/opticav-probador.git
   git push -u origin main
   ```
3. En GitHub, ve a **Settings → Pages**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`.
4. En uno o dos minutos la tienda queda en `https://TU_USUARIO.github.io/opticav-probador/`.

GitHub Pages sirve todo por HTTPS, que es un requisito para usar la cámara en el celular.

## Probar en local

La cámara solo funciona en `https://` o en `localhost`:

```bash
python -m http.server 8123
```

Luego abre http://localhost:8123.

## Estructura

```
index.html               Página única (vitrina, probador, bolsa y caja)
css/styles.css           Estilos, con la paleta coral/roja de la marca
js/catalog.js            Catálogo: modelos, medidas, variantes y precios
js/glasses-renderer.js   Dibuja los anteojos paramétricos en 3D simple (canvas)
js/tryon.js              Cámara, MediaPipe, pose del rostro y tipo de rostro
js/app.js                Lógica de la tienda
```

Para agregar un modelo, suma un objeto en `PRODUCTS` (`js/catalog.js`) con su forma (`round`, `oval`, `square`, `rectangle`, `aviator`, `cateye`, `browline` o `hexagon`), material, medidas y variantes de color. El armazón se dibuja solo a partir de esos datos, sin necesidad de fotos.
