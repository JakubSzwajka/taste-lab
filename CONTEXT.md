# Taste library

The library holds reusable UI and the interactive screens composed from it. The operator judges both in context before using them in an app.

## Language

**Component**:
A reusable UI part with its own examples and behavior. A screen can contain several components, including other compositions.
_Avoid_: Screen when referring to an individual reusable part.

**Screen**:
An interactive composition of library components representing a whole app view, shown at its actual intended size. A screen is also a component in the composition sense, but Screens and Components are distinct browsing categories in the library.
_Avoid_: Layout-only mockup, thumbnail when referring to the screen itself.

**Flow**:
A visualization of how screens connect through a user journey. It is separate from the screens and their local interactivity.
_Avoid_: Screen, component tree.

**Example**:
A named presentation of a library entry in a particular state or with particular data.
_Avoid_: Flow when showing one component or screen state.
