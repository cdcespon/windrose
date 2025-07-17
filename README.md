# Rosa de Vientos - Aplicación para Ingeniería Aeronáutica

Esta aplicación web permite generar un gráfico de rosa de vientos a partir de datos de dirección y velocidad del viento cargados desde un archivo CSV. Es una herramienta útil para análisis en ingeniería aeronáutica, meteorología y estudios de viento.

## Características

- Carga de datos desde archivos CSV
- Detección automática de columnas de dirección y velocidad
- Visualización de rosa de vientos con diferentes rangos de velocidad
- Cálculo y visualización de la dirección de pista óptima sugerida
- Referencias de direcciones (N, S, E, W, etc.) con códigos de colores en una columna a la izquierda
- Muestra información del archivo y vista previa completa de todos los datos
- Interfaz sencilla y responsive

## Cómo usar la aplicación

1. Abra el archivo `index.html` en su navegador web
2. Haga clic en "Seleccionar archivo" y elija un archivo CSV con datos de viento
3. La aplicación procesará automáticamente los datos y generará el gráfico de rosa de vientos
4. En la parte inferior se mostrará información sobre el archivo y una vista previa de los datos

## Formato del archivo CSV

La aplicación espera un archivo CSV con al menos dos columnas:

- Una columna para la dirección del viento (en grados, donde 0° es Norte, 90° es Este, etc.)
- Una columna para la velocidad del viento (en km/h)

La aplicación intentará detectar automáticamente estas columnas basándose en sus nombres. Se recomiendan nombres como:

- Para dirección: "direccion", "dirección", "dir", "direction", etc.
- Para velocidad: "velocidad", "vel", "speed", etc.

Si no se pueden detectar automáticamente, se utilizarán las dos primeras columnas del archivo.

Ejemplo de formato CSV:
```
direccion,velocidad,fecha,hora
0,5,2023-01-01,00:00
45,8,2023-01-01,01:00
90,12,2023-01-01,02:00
```

## Archivo de muestra

Se incluye un archivo de muestra `sample_wind_data.csv` con datos ficticios para probar la aplicación. Este archivo contiene:

- Dirección del viento (en grados)
- Velocidad del viento (en km/h)
- Fecha y hora (para referencia)

## Interpretación del gráfico de rosa de vientos

El gráfico de rosa de vientos muestra:

- La distribución de la dirección del viento (en 16 direcciones: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW)
- La distribución de la velocidad del viento (en 5 rangos: 0-5 km/h, 5-10 km/h, 10-15 km/h, 15-20 km/h, >20 km/h)
- La frecuencia de cada combinación de dirección y velocidad
- Un rectángulo translúcido que indica la dirección de pista óptima sugerida, con un tooltip que muestra los grados exactos al pasar el cursor
- Marcadores de grados cada 15° (0°, 15°, 30°, 45°, etc.) en el círculo exterior para referencia precisa
- Referencias de direcciones cardinales e intercardinales con códigos de colores en una columna a la izquierda
- Colores del gráfico que corresponden con los colores de las referencias en la columna izquierda
- Sin leyenda debajo del gráfico para una visualización más limpia

Los colores representan diferentes rangos de velocidad, y el tamaño de cada sector indica la frecuencia de ocurrencia.

## Dirección de pista sugerida

La aplicación calcula automáticamente la dirección de pista óptima basada en los datos de viento cargados. Esta funcionalidad es especialmente útil para ingeniería aeronáutica y diseño de aeropuertos.

El cálculo:
1. Convierte todos los datos de viento en vectores
2. Suma estos vectores para obtener un vector resultante
3. Calcula la dirección perpendicular al vector resultante (ya que las pistas se alinean perpendiculares al viento predominante)
4. Redondea la dirección a los 10 grados más cercanos (estándar para numeración de pistas)

La información mostrada incluye:
- Dirección óptima en grados
- Designación de pista (por ejemplo, 09/27)
- Orientación en grados para ambos sentidos de la pista

El rectángulo translúcido gris superpuesta en el gráfico de rosa de vientos representa visualmente esta dirección de pista sugerida.

## Tecnologías utilizadas

- HTML5, CSS3 y JavaScript
- Chart.js para la visualización del gráfico
- PapaParse para el procesamiento de archivos CSV

## Personalización

Puede personalizar los rangos de velocidad y colores modificando el archivo `script.js`. Busque la sección donde se definen los `speedRanges` para ajustar los rangos y colores según sus necesidades.