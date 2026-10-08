// node:test reads each file's results from its stdout, and raw log writes there can corrupt them (nodejs/node#64061)
console.log = console.info = console.debug = console.error;
