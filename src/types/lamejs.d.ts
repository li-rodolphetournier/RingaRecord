/**
 * Déclarations TypeScript pour lamejs
 */
declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitrate: number);
    encodeBuffer(left: Float32Array, right: Float32Array): Int8Array;
    flush(): Int8Array;
  }
}

