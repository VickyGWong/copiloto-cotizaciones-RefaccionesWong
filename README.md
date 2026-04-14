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

## Tabla de contenidos

- [Descripción](#descripción)
- [Problema identificado](#problema-identificado)
- [Solución](#solución)
- [Arquitectura](#arquitectura)
- [Tabla de contenidos](#tabla-de-contenidos)
- [Requerimientos](#requerimientos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
  - [Referencia para usuario final](#referencia-para-usuario-final)
  - [Referencia para usuario administrador](#referencia-para-usuario-administrador)
- [Contribución](#contribución)
- [Roadmap](#roadmap)
- [Demo en video](#demo-en-video)
- [Tablero público del proyecto](#tablero-público-del-proyecto)

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

## Instalación

### ¿Cómo instalar el ambiente de desarrollo?

1. Instalar Git en el equipo local.
2. Instalar Firefox Developer Edition o un navegador Firefox compatible con pruebas de extensiones.
3. Clonar el repositorio del proyecto con el siguiente comando:

```bash
git clone https://github.com/VickyGWong/copiloto-cotizaciones-RefaccionesWong.git
