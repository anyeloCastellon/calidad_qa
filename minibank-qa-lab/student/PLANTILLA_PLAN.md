# Plan de pruebas estratégico: MiniBank

**Nombre:**
**Fecha:**
**Rol:** QA Lead

---

## 1. Estrategia

### 1.1 Caja negra

**Módulos evaluados:**

| ID | Requisito | Técnica | Entrada | Resultado esperado | Resultado observado | ¿Pasa? | Tipo de error |
|---|---|---|---|---|---|---|---|
| CN-01 | RF03 | Valor límite | monto = 1 | Transferencia realizada | | | |
| CN-02 | | | | | | | |

*Tipo de error:* validación de datos · flujo de usuario · regla de negocio · usabilidad y consistencia

### 1.2 Caja blanca

**Grafo de flujo de `validar_transferencia`:**

```
(dibújelo aquí)
```

**V(G) calculado:** ____ · **V(G) según radon:** ____

| Camino | Condiciones | Datos de prueba | Resultado esperado según requisitos | Test |
|---|---|---|---|---|
| C1 | | | | `test_...` |

**Análisis de bucles de `validar_rut`:**

| Iteraciones | RUT de prueba | Resultado esperado |
|---|---|---|
| 0 | | |
| 1 | | |
| típico | | |

**¿100 % de cobertura de ramas significa que el código es correcto? ¿Por qué?**

### 1.3 Enfoque híbrido

| ID | Aspecto | Qué se hizo | Código HTTP | Qué mostró la pantalla | ¿React o Python? |
|---|---|---|---|---|---|
| INT-01 | Contrato de API | | | | |
| INT-02 | Manejo de errores | | | | |
| INT-03 | Sincronización de estado | | | | |
| INT-04 | Datos en tránsito | | | | |

---

## 2. Riesgo y seguridad

### 2.1 Módulos críticos

| Módulo / función | V(G) | ¿Maneja dinero o seguridad? | Nivel de riesgo | Justificación |
|---|---|---|---|---|
| | | | | |

### 2.2 Flujo de datos

| Dato sensible | Dónde se crea | Por dónde pasa | Dónde queda almacenado o expuesto | ¿Cumple? | Evidencia |
|---|---|---|---|---|---|
| Clave | formulario de login | | | | |
| Token | `/api/login` | | | | |

**Escenarios de ataque considerados:**

1.
2.

---

## 3. Herramientas y métricas

**Herramienta elegida:**

| Criterio | Justificación |
|---|---|
| Trazabilidad | |
| Reutilización | |
| Auditoría y cumplimiento | |

| Métrica | Meta | Cómo se mide | Por qué importa en banca |
|---|---|---|---|
| Cobertura de requisitos | ≥ 90 % | | |
| Defectos críticos antes de producción | ≥ 98 % | | |
| | | | |

**Casos humanos vs casos IA:**

---

## 4. Entregables

### 4.1 Matriz de trazabilidad

| Requisito | Riesgo | Caso | Técnica | Resultado | Defecto | Módulo afectado |
|---|---|---|---|---|---|---|
| RF01 | | | | | | |
| RF02 | | | | | | |
| RF03 | | | | | | |
| RF04 | | | | | | |
| RF05 | | | | | | |
| RF06 | | | | | | |
| RF07 | | | | | | |
| RNF01 | | | | | | |
| RNF02 | | | | | | |
| RNF03 | | | | | | |
| RNF04 | | | | | | |

### 4.2 Defectos encontrados

| ID | Requisito | Severidad | Pasos para reproducir | Esperado | Observado | Evidencia |
|---|---|---|---|---|---|---|
| DEF-01 | | | | | | |

### 4.3 Cronograma basado en riesgos

Escala de 1 a 5. **Prioridad = Impacto × Probabilidad × Complejidad** (máximo 125).

| Orden | Módulo / área | Impacto | Probabilidad | Complejidad | Prioridad | Casos | Momento de ejecución |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |

### 4.4 Protocolo de mantenimiento del plan

| Disparador | Ejemplo en MiniBank | Qué se revisa | Responsable | Plazo |
|---|---|---|---|---|
| Cambio regulatorio | La CMF exige doble factor sobre $250.000 | | | |
| Cambio funcional | La comisión sube a $500 | | | |
| Cambio de arquitectura | Se agrega una base de datos real | | | |
| Defecto en producción | | | | |

---

## 5. Recomendación

**¿Autoriza el paso a producción?** Sí / No / Con condiciones

**Justificación:**
