// `node --test` runs each test file in a child process and streams the results
// back to the parent as V8-serialised data on stdout. Listr renderers write task
// progress to that same stream, and the smart renderer keeps doing so on a timer,
// so a render that lands mid-message corrupts the stream and fails the entire
// file with "Unable to deserialize cloned data due to invalid or unsupported
// version". Spread this into the options of every task runner built in a test.
//
// `silentRendererCondition` is used rather than `renderer: 'silent'` because
// `makeTaskRunner` overrides `renderer` whenever `verbose` is set, and some tests
// need `verbose: true` to exercise the task's verbose output paths.
export const silentRenderer = {
    silentRendererCondition: true
};
