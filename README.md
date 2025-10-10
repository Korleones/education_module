# 📁 Project Structure Overview

This document explains the purpose of each main folder and file in the **Arludo Stem Course And Career Recommender For Primary And High School Students(React Native Mobile App)** project.    
It follows professional React Native + TypeScript architecture for team collaboration and scalability.

---

## 🧭 Root Structure

```
src/
├─ components/
├─ data/
├─ screens/
├─ services/
├─ stores/
├─ theme/
├─ types/
├─ utils/
└─ App.tsx
```


---

## 📂 Folder Descriptions

### `components/`
Reusable UI components shared across multiple screens.  
Contains small, presentational elements such as buttons, cards, modals, or icons.  
Focuses purely on the visual layer, not business logic.

---

### `data/`
Local or mock data for development and testing.  
Stores static `.json` files, configuration data, or temporary datasets used by the app logic.

---

### `screens/`
Top-level pages representing different parts of the app.  
Each screen composes multiple components and handles its own logic, layout, and navigation behavior.

---

### `services/`
Business logic and functional layer of the application.  
Contains core algorithms, data processing, API calls, and recommendation logic.

---

### `stores/`
Global state management (using Zustand, Redux, or similar).  
Acts as the centralized data layer shared across all screens and components.

---

### `theme/`
Defines the global design system — including colors, font sizes, spacing, and other visual tokens.  
Ensures consistent styling across the entire app.

---

### `types/`
Holds TypeScript type definitions and interfaces.  
Used to describe data structures and enforce type safety throughout the codebase.

---

### `utils/`
Utility functions and generic helpers.  
Contains small, pure functions that perform calculations or data transformations independent of UI.

---

### `App.tsx`
Main entry point of the app.  
Initializes navigation, wraps global providers, and defines the app’s starting screen.

---

## 🧱 Summary Table

| Folder | Purpose |
|---------|----------|
| `components/` | Shared UI components |
| `data/` | Static or mock data |
| `screens/` | Full application pages |
| `services/` | Business logic and API layer |
| `stores/` | Global state management |
| `theme/` | Global colors and typography |
| `types/` | TypeScript interfaces and models |
| `utils/` | Helper and utility functions |
| `App.tsx` | Application entry point |

---

> 🧠 This structure follows best practices used in production React Native apps, promoting maintainability, clarity, and teamwork scalability.
