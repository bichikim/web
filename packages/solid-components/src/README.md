```tsx
<!-- Element that holds most of the state for child components and provides it via context -->
<Root>
  <!--Container element: Prefer rendering a single root element if possible-->
  <Body>
    <!-- Drag able element-->
    <Handle />
    <!--text,image ... input -->
    <Input />
    <!-- Element for description content -->
    <Label />
    <!-- When a specific input (click) triggers a repeated state change -->
    <Toggle />
    <!-- Element that renders to indicate state changes -->
    <Indicator />
    <!-- Content that is rendered additionally around the main content -->
    <Aside />
    <!-- Content that should be separated as a container from Body when it needs to be separated as a child -->
    <Content />
    <!-- Container for handle that can only move along a bar path when the handle is raised -->
    <Rail />
    <!-- Component name for when Content is repeatedly rendered inside a list container -->
    <Item />
    <!-- Component that repeatedly renders Item -->
    <List />
    <!-- Content component that corresponds to a title within Content -->
    <Title />
    <!-- Content component that corresponds to a subtitle within Content -->
    <SubTitle />
  </Body>
```
