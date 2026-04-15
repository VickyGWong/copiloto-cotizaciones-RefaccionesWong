# Copiloto de Cotizaciones para Refacciones Wong

Copiloto de cotizaciones como extensión de navegador para Refacciones Wong.

## Descripción

El presente proyecto consiste en el desarrollo de un copiloto de cotizaciones implementado como extensión de navegador para Refacciones Wong. Su propósito es apoyar al área de ventas B2B en el análisis de solicitudes de cotización vehicular provenientes de portales de clientes y aseguradoras.

La solución busca extraer información visible de la solicitud, organizarla dentro de un panel lateral y facilitar su lectura por parte del usuario. Además, permite integrar datos clave en la cabecera de impresión y brindar apoyo en la validación inicial del vehículo y en la revisión preliminar de las piezas solicitadas.

## Problema identificado

Dentro del proceso de cotización de Refacciones Wong se detectó que el personal de ventas B2B debe revisar manualmente información dispersa, incompleta o poco clara proveniente de distintos portales de clientes. Esto obliga a invertir tiempo en interpretar datos del vehículo, validar especificaciones, revisar fotografías y contrastar la información con otras fuentes antes de poder avanzar con la cotización.

Esta dinámica genera principalmente dos problemas. El primero es la pérdida de tiempo operativo en tareas repetitivas de revisión e investigación previa. El segundo es la generación de retrabajos, ya que al agregarse información manualmente o al trabajar con datos incorrectos o incompletos, pueden producirse devoluciones entre áreas y retrasos en el flujo de atención.

## Solución

Como respuesta a esta necesidad, se propone un copiloto de cotizaciones implementado como extensión de navegador. La herramienta permite recuperar datos visibles desde portales autorizados, organizarlos en un panel lateral y presentarlos de forma más clara al usuario.

Asimismo, el sistema permite integrar información relevante en la cabecera de impresión de la cotización, con el fin de reducir el llenado manual y mejorar la legibilidad del documento para otras áreas. De manera complementaria, el copiloto brinda apoyo para validar datos iniciales del vehículo y revisar de forma preliminar si las piezas solicitadas parecen corresponder con la información del caso.

Es importante señalar que esta solución no sustituye el criterio del usuario ni automatiza por completo la cotización dentro del ERP. Su función principal es servir como herramienta de apoyo para agilizar el análisis, reducir errores tempranos y estandarizar parte del flujo operativo.

## Arquitectura

La arquitectura del proyecto está basada en una extensión de navegador que trabaja localmente sobre portales autorizados. El flujo general es el siguiente:

1. La extensión lee la información visible de la solicitud dentro del portal del cliente.
2. Los datos extraídos se organizan y se muestran en un panel lateral.
3. La información principal puede integrarse a la cabecera de impresión de la cotización.
4. Paralelamente, se apoya la validación inicial del vehículo y la revisión preliminar de piezas.
5. La ejecución se restringe a dominios autorizados y se evita exponer información procesada fuera del entorno de trabajo.
6. El desarrollo se administra en GitHub, con ramas principales de trabajo y validación mediante integración continua.

### Componentes principales del sistema

- **Módulo de extracción de datos:** recupera la información visible de la solicitud en portales autorizados.
- **Módulo de organización y visualización:** muestra la información en un panel lateral de lectura rápida.
- **Módulo de integración a impresión:** agrega datos relevantes a la cabecera de impresión.
- **Módulo de validación inicial del vehículo:** ayuda a revisar consistencia entre VIN, placas, marca, modelo y año.
- **Módulo de apoyo para identificación de piezas:** facilita la revisión preliminar de piezas solicitadas.
- **Módulo de seguridad y control:** restringe la ejecución a portales autorizados y protege la información procesada.

> Nota: el diagrama de arquitectura del proyecto se encuentra documentado en la evidencia de la fase 3 y representa el flujo funcional de la extensión, GitHub, tablero de seguimiento y GitHub Actions.

## Requerimientos

### Requerimientos técnicos

- Navegador Firefox Developer Edition o versión compatible para pruebas de extensiones.
- Equipo local con acceso a los portales autorizados por la empresa.
- Repositorio del proyecto en GitHub.
- Git para clonar y versionar el proyecto.
- Acceso a las ramas principales del repositorio.
- Permisos para cargar la extensión de manera temporal en el navegador durante las pruebas.

### Estructura tecnológica

- **Lenguaje principal:** JavaScript
- **Interfaz:** HTML y CSS
- **Control de versiones:** Git y GitHub
- **Integración continua:** GitHub Actions
- **Tablero de seguimiento:** Trello
- **Tipo de producto:** extensión de navegador

### Elementos que no aplican a esta versión

Debido a la arquitectura real del proyecto, en esta versión no se requiere:

- Servidor de aplicación
- Servidor web dedicado
- Base de datos
- WAR o JAR de despliegue
- Implementación en Heroku
- Versión de Java para ejecución del producto

Lo anterior no aplica porque la solución se ejecuta localmente dentro del navegador y opera directamente sobre los portales autorizados.

## Configuración

La configuración principal del proyecto se realiza a través de los archivos base de la extensión, especialmente `manifest.json`, así como los archivos de lógica y visualización del copiloto.

Entre los elementos principales de configuración se encuentran:
- permisos de ejecución,
- dominios autorizados,
- scripts de extracción de información,
- archivos del panel lateral,
- y comportamiento general de la extensión dentro de los portales permitidos.

Para esta versión académica, la configuración se mantiene enfocada en el funcionamiento local de la extensión dentro del navegador.

## Instalación

### ¿Cómo instalar el ambiente de desarrollo?

1. Instalar Git en el equipo local.
2. Instalar Firefox Developer Edition o un navegador Firefox compatible con pruebas de extensiones.
3. Clonar el repositorio del proyecto con el siguiente comando:
```bash
git clone https://github.com/VickyGWong/copiloto-cotizaciones-RefaccionesWong.git
```
4. Cargar la extensión en Firefox Developer Edition para realizar pruebas locales.

## Uso

La solución está diseñada como una herramienta de apoyo operativo para el área de ventas B2B de Refacciones Wong. Su función es facilitar la lectura de solicitudes, organizar la información visible del caso y reducir tareas manuales previas a la cotización.

### Referencia para usuario final

El usuario final es el agente de ventas o cotizador que trabaja directamente con solicitudes dentro de portales autorizados.

Flujo básico de uso:
1. Ingresar a un portal autorizado.
2. Abrir una solicitud de cotización.
3. Abrir el caso y verificar que la extensión lea la información visible.
4. Seleccionar el botón de Analizar
5. Revisar la información organizada en el panel lateral.
6. Confirmar datos principales del vehículo y de la solicitud.
8. Integrar la información relevante a la cabecera con el comando de impresión.

### Referencia para usuario administrador

El usuario administrador corresponde al responsable técnico o interno que da mantenimiento al proyecto.

Actividades principales:
- cargar o actualizar la extensión en el navegador,
- revisar cambios en los portales para mantener funcional la extracción,
- validar el estado del repositorio y GitHub Actions,
- y controlar cambios mediante ramas y pull requests.

## Contribución

Las contribuciones al proyecto deben seguir un flujo controlado para mantener orden y trazabilidad dentro del repositorio.

Pasos básicos de contribución:
1. Clonar el repositorio.
2. Crear o utilizar la rama `develop`.
3. Crear un branch nuevo para la funcionalidad o corrección.
4. Realizar cambios y validarlos.
5. Generar commit con un mensaje claro.
6. Subir la rama al repositorio remoto.
7. Crear un pull request.
8. Esperar revisión antes de hacer merge.

## Roadmap

Las mejoras previstas para versiones futuras del proyecto incluyen:
- validación cruzada con catálogos internos del ERP,
- fortalecimiento del apoyo para identificación de piezas,
- mejoras en validación inicial del vehículo,
- refinamiento visual del panel lateral,
- y ajustes de compatibilidad ante cambios en portales externos.

## Producto descargable

Como evidencia del producto funcional, el repositorio incluye el paquete instalable de la extensión para Firefox:

**Mozilla Firefox CopilotoWong V1-0.3.3.xpi**

Este archivo representa la versión empaquetada de la extensión para fines de demostración y evidencia académica.

## Tablero público del proyecto

Inicialmente, el seguimiento del proyecto se realizó mediante Zube, en cumplimiento con la fase previa de administración del trabajo. Sin embargo, para esta entrega final se migró la visualización del avance a Trello, ya que Zube no permitió generar un enlace público accesible para validación externa por parte del evaluador.

El tablero público conserva la lógica de organización del trabajo por funcionalidades, seguridad, pruebas y elementos fuera de alcance de la primera versión.

**Enlace del tablero público:**  
https://trello.com/b/KVeLJcbQ/copiloto-refacciones-wong 
