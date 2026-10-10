export const createDynamicWorker = (script: string) => {
  // Blobs require serializable objects or arrays of content.
  var blob = new Blob([script], { type: "text/javascript" });

  // Handle to our blob URL.
  var url = globalThis.URL.createObjectURL(blob);

  // Create our worker from our handle.
  var worker = new Worker(url);

  // The worker has its own reference to the script after construction.
  globalThis.URL.revokeObjectURL(url);

  return worker;
};
