<div align="center">

<!-- <img src="public/preview.png" alt="Vista general de la demo" width="100%" /> -->

<h1>Práctico 2 — Ingeniería de Software II</h1>

<p><strong>Refactorización de un servicio monolítico en una arquitectura con responsabilidades separadas, inyección de dependencias y validación del flujo mediante una aplicación web demo.</strong></p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/esbuild-0.25-FFCF00?style=for-the-badge&logo=esbuild&logoColor=black" alt="esbuild">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
</p>

<p>
  <img src="https://img.shields.io/badge/Estado-Entregado-brightgreen?style=for-the-badge" alt="Estado: Entregado">
  <img src="https://img.shields.io/badge/Licencia-MIT-f5c542?style=for-the-badge" alt="Licencia MIT">
</p>

</div>

---

## Descripción general

Este proyecto corresponde al **Práctico 2 de Ingeniería de Software II** y aborda el concepto de **refactorización de código inflado (God Method)** aplicando principios **SOLID**, con énfasis en **Single Responsibility Principle (SRP)** e **Inversión de Dependencias**.

Se tomó como base el archivo `infladores.py`, que contenía un método `processOrder` de aproximadamente 110 líneas donde convivían **14 responsabilidades distintas**: validación de usuarios, verificación KYC, validación de órdenes, control de stock, cálculos de precios, procesamiento de pagos, descuento de inventario, envío de notificaciones, acumulación de puntos de fidelidad, entre otras.

El trabajo consistió en descomponer ese monolito en una arquitectura basada en **inyección de dependencias** con interfaces claras, implementaciones separadas, y una aplicación web de prueba que permite validar visualmente el comportamiento del servicio refactorizado.

---

## Problema identificado en el código original

El método `processOrder` en el archivo original presentaba múltiples violaciones de diseño:

- **Una sola función hacía TODO**: validación de usuarios, KYC, verificación de órdenes, stock, precios, pagos, descuento de inventario, alertas, emails, eventos, puntos de fidelidad
- **Mezcla de niveles de abstracción**: operaciones de bajo nivel (`product.stock -= item.quantity`) convivían con operaciones de alto nivel (`this.emailService.sendConfirmation`)
- **Sin aislamiento de efectos secundarios**: si el descuento de stock fallaba después del cobro, no había rollback ni transaccionalidad
- **Código duplicado**: se recorría la lista de items **dos veces** (una para validar stock y otra para descontar)
- **Idioma inconsistente**: mensajes de error mezclaban español e inglés
- **Extensión de archivo incorrecta**: el código estaba en TypeScript pero el archivo se llamaba `.py`

---

## Solución implementada

Se desarrolló un proyecto **TypeScript vanilla** con las siguientes características:

### Refactorización del servicio

El método `processOrder` se descompuso en **8 métodos privados**, cada uno con una única responsabilidad:

| Método | Responsabilidad |
|--------|----------------|
| `getValidatedUser` | Validar existencia, estado, email y KYC del usuario |
| `getValidatedOrder` | Validar existencia, pertenencia, estado y vigencia de la orden |
| `validateItems` | Verificar stock suficiente para cada producto |
| `calculateSubtotal` | Sumar precios de los items validados |
| `calculateTotal` | Aplicar descuentos e impuestos |
| `processPayment` | Cobrar con el medio de pago y manejar fallos |
| `deductStock` | Descontar inventario y disparar alertas de stock bajo |
| `finalizeOrder` | Persistir la orden confirmada |
| `notifyConfirmation` | Enviar email y publicar evento de confirmación |

El método principal quedó reducido a **12 líneas** que describen el flujo completo sin exponer los detalles internos:

```
validar usuario → validar orden → validar stock → calcular subtotal → calcular total → cobrar → descontar stock → finalizar orden → notificar
```

### Inyección de dependencias

El servicio recibe **todas sus dependencias por constructor** a través de interfaces (`UserRepo`, `OrderRepo`, `PaymentGateway`, `EventBus`, etc.), lo que permite:

- Probar el servicio con implementaciones alternativas
- Intercambiar implementaciones sin modificar el código del servicio
- Visualizar efectos secundarios (eventos, emails, alertas) a través de stubs registrados en memoria

---

## Criterio de refactorización aplicado

La refactorización se guió por los siguientes principios:

- **Single Responsibility Principle (SRP)**: cada método extraído tiene una única razón para cambiar
- **Inversión de Dependencias (DIP)**: el servicio depende de interfaces, no de implementaciones concretas
- **Nivel único de abstracción**: el método `processOrder` solo orquesta; los detalles viven en los métodos privados
- **Pipeline explícito**: el flujo se lee de arriba a abajo sin saltos ni efectos secundarios ocultos
- **Eliminación de código duplicado**: `validateItems` devuelve los productos resueltos, que se reutilizan en `deductStock` sin volver a consultar el repositorio

---

## Escenarios de prueba implementados

Para validar el comportamiento del servicio refactorizado, se precargaron **5 escenarios distintos** en la aplicación demo:

| Orden | Usuario | Escenario | Resultado esperado |
|-------|---------|-----------|-------------------|
| `order-ok` | `user-1` (Juan Pérez) | Flujo exitoso completo | ✅ Orden confirmada, email enviado, puntos acumulados |
| `order-expired` | `user-1` (Juan Pérez) | Orden vencida | ❌ Bloqueado por validación de expiración |
| `order-low-stock` | `user-2` (María García) | Stock insuficiente en uno de los productos | ❌ Bloqueado por validación de inventario |
| `order-banned` | `user-banned` (Carlos López) | Usuario suspendido | ❌ Bloqueado por estado de usuario |
| `order-empty` | `user-1` (Juan Pérez) | Orden sin items | ❌ Bloqueado por orden vacía |

Cada escenario puede ejecutarse desde la interfaz web para verificar que las validaciones funcionan correctamente y que el flujo se interrumpe en el punto exacto donde corresponde.

---

## Validaciones incorporadas

El servicio valida secuencialmente cada condición antes de avanzar a la siguiente etapa:

- **Usuario**: existencia, estado no baneado, email verificado, KYC aprobado
- **Orden**: existencia, pertenencia al usuario, estado pendiente, items no vacío, no expirada
- **Stock**: existencia del producto, cantidad suficiente disponible
- **Pago**: método de pago registrado, transacción aprobada por el gateway

Cada validación fallida lanza un error con un mensaje descriptivo que se muestra en la interfaz web.

---

## Infraestructura de prueba

Se implementaron **implementaciones en memoria** de todas las dependencias del servicio:

- **Repositorios**: almacenan datos en `Map` internos con `structuredClone` para evitar mutación accidental
- **Stubs de servicios**: permiten simular comportamientos (KYC falla, pago rechazado, etc.)
- **EventBus en memoria**: registra eventos publicados para su inspección posterior
- **Rastreo de efectos secundarios**: emails enviados, alertas generadas y puntos de fidelidad acumulados se almacenan y exponen en la UI

---

## Vista previa

<div align="center">

<!-- <img src="public/preview.png" alt="Demo del OrderService" width="100%" /> -->

</div>

---

## Funcionamiento general

1. La aplicación inicia con datos semilla precargados (usuarios, productos, órdenes, métodos de pago).
2. La interfaz web muestra los datos disponibles en tablas.
3. El usuario selecciona una orden y un usuario desde los menús desplegables.
4. Al presionar "Procesar", el servicio ejecuta el flujo completo de `processOrder`.
5. Si la operación es exitosa, se muestra el resultado JSON con los datos de la orden confirmada.
6. Si falla alguna validación, se muestra el mensaje de error correspondiente.
7. En ambos casos, se actualizan los paneles de efectos secundarios (eventos, emails, alertas, puntos de fidelidad).

---

## Estructura del proyecto

```txt
src/
  types.ts                        # Interfaces del dominio y contratos
  OrderService.ts                 # Servicio refactorizado con SRP
  infrastructure/
    repos.ts                      # Repositorios en memoria (User, Order, Product, Payment)
    services.ts                   # Stubs de servicios (KYC, Promo, Tax, Payment, Alert, Email, Loyalty)
    eventBus.ts                   # Event bus en memoria
  seed.ts                         # Datos de prueba con 5 escenarios
  main.ts                         # Entry point: wiring, controlador de UI
index.html                        # Interfaz web de prueba
package.json                      # Build config con esbuild
tsconfig.json                     # Configuración de TypeScript
```

---

## Ejecución del proyecto

```bash
npm install
npm run build     # Compila TypeScript a un bundle ESM en dist/app.js
npx serve .       # Sirve la aplicación en http://localhost:3000
```

O en un solo paso:

```bash
npm start
```

---

## Prueba funcional

Para verificar el funcionamiento del servicio refactorizado:

1. abrir `http://localhost:3000` en el navegador
2. revisar los datos precargados en las tablas (usuarios, productos, órdenes)
3. seleccionar la orden `order-ok` y el usuario `user-1` (Juan Pérez)
4. presionar "Procesar"
5. comprobar que el resultado muestra éxito con los datos de la orden confirmada
6. verificar los efectos secundarios: evento `order.confirmed`, email de confirmación, puntos de fidelidad
7. repetir con los demás escenarios para verificar que cada validación falla correctamente:
   - `order-expired` → "Order expirado"
   - `order-low-stock` → "Insuficiente stock"
   - `order-banned` → "Usuario prohibido"
   - `order-empty` → "orden vacia"

Como resultado, se puede comprobar que el servicio administra correctamente el flujo completo, las validaciones de negocio, y que los efectos secundarios se registran adecuadamente sin acoplar la lógica del dominio a implementaciones concretas.

---

## Conclusión

Se logró transformar un método monolítico de 110 líneas con 14 responsabilidades acopladas en una arquitectura basada en **inyección de dependencias** y **responsabilidades separadas**.

La aplicación web demo permite validar visualmente que:

- el flujo de procesamiento de órdenes se comporta correctamente
- cada validación de negocio se ejecuta en el orden adecuado
- los efectos secundarios (eventos, emails, alertas) se registran sin acoplar la lógica del dominio
- el servicio puede operar con diferentes implementaciones sin modificaciones

La refactorización cumple con los principios **SOLID** aplicados al diseño de software, demostrando que un código bien estructurado no solo es más mantenible, sino también más fácil de probar y extender.
