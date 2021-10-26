export const setupDevtoolsPlugin = (options: any, setup: any) => {
  const api = {
    addInspector: (options) => {
      // empty
    },

    on: {
      editInspectorState: (handler: any) => {
        // empty
      },
      getInspectorState: (handler: any) => {
        // empty
      },
      getInspectorTree: (handler: any) => {
        // empty
      },
    },
  }

  setup(api)
}
