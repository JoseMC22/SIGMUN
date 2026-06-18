# Sistema de Diseño — SAT ICA / SIGMUN

## Colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| SAT Navy | `#002855` | Primario, encabezados, botones principales |
| SAT Cyan | `#00A9E0` | Acentos, enlaces, flechas, hover states |
| Clean White | `#F8FAFC` | Fondos light |
| Slate Deep | `#0F172A` | Fondos dark |
| Gradiente | `linear-gradient(135deg, #002855 0%, #004B91 100%)` | Headers, hero sections |

## Tipografía

| Fuente | Uso | Pesos |
|--------|-----|-------|
| **Outfit** | Títulos y encabezados | Bold 700 / SemiBold 600 |
| **Inter** | Cuerpo de texto y formularios | Regular 400 / Medium 500 |

## Componentes UI

- **Framework:** shadcn/ui sobre Tailwind CSS v4
- **Iconos:** lucide-react
- **Animaciones:** framer-motion (opcional, para microinteracciones)

## Estética visual

| Elemento | Especificación |
|----------|---------------|
| Bordes de tarjetas | `rounded-xl` (`0.75rem` / 12px) |
| Glassmorphism | `backdrop-filter: blur(10px)` + fondo semitransparente (`rgba(255,255,255,0.8)` light, `rgba(15,23,42,0.8)` dark) |
| Sombras | Estilo "Float" — suaves y profundas |
| Feedback de carga | Skeleton loaders (no spinners genéricos) |

## Accesibilidad

- WCAG 2.1 AA mínimo
- Contraste de texto >= 4.5:1
- Foco visible en todos los elementos interactivos
- Navegación por teclado completa
- Roles ARIA donde sea necesario

## Idioma en UI

- **Todo el texto visible** al usuario en español
- **Sin strings hardcodeadas** en componentes — usar archivo de locales cuando haya i18n
- **Código** (variables, funciones, clases, archivos) en inglés
