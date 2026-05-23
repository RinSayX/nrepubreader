jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documents/",
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(async () => ({ exists: true }))
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_algorithm, value) => `sha-${value.length}`)
}));
