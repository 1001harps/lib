export const createDynamicWorker = (script: string) => {
  // Blobs require serializable objects or arrays of content.
  var blob = new Blob([script], { type: "text/javascript" });

  // Handle to our blob URL.
  var url = window.URL.createObjectURL(blob);

  // Create our worker from our handle.
  var worker = new Worker(url);

  return worker;
};
