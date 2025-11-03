import { getAddress, bytesToHex } from 'viem';

let fheInstance: any = null;

/**
 * Get SDK from window (loaded via static script tag in HTML)
 * SDK 0.3.0-5 is loaded via static script tag in index.html
 */
const getSDK = (): any => {
  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires browser environment');
  }

  // Check for both uppercase and lowercase versions
  const sdk = (window as any).RelayerSDK || (window as any).relayerSDK;

  if (!sdk) {
    throw new Error('RelayerSDK not loaded. Please ensure the script tag is in your HTML.');
  }

  return sdk;
};

export const initializeFHE = async (provider?: any): Promise<any> => {
  if (fheInstance) {
    return fheInstance;
  }

  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires browser environment');
  }

  // Get Ethereum provider from multiple sources
  const ethereumProvider = provider ||
    (window as any).ethereum ||
    (window as any).okxwallet?.provider ||
    (window as any).okxwallet;

  if (!ethereumProvider) {
    throw new Error('Ethereum provider not found. Please connect your wallet first.');
  }

  console.log('[FHE] Initializing FHE SDK...');

  const sdk = getSDK();
  const { initSDK, createInstance, SepoliaConfig } = sdk;

  console.log('[FHE] SDK found, calling initSDK()...');
  await initSDK();
  console.log('[FHE] ✅ SDK initialized');

  const config = { ...SepoliaConfig, network: ethereumProvider };

  try {
    fheInstance = await createInstance(config);
    console.log('[FHE] ✅ FHE instance initialized for Sepolia');
    return fheInstance;
  } catch (error) {
    console.error('[FHE] ❌ createInstance failed:', error);
    throw error;
  }
};

export const getFHEInstance = (): any => {
  return fheInstance;
};

export const isFheReady = (): boolean => {
  return fheInstance !== null;
};

export const encryptWeight = async (
  weight: number | bigint,
  contractAddress: string,
  userAddress: string
): Promise<{ handle: `0x${string}`; proof: `0x${string}` }> => {
  if (!fheInstance) {
    await initializeFHE();
  }
  if (!fheInstance) {
    throw new Error('FHE instance not initialized. Call initializeFHE() first.');
  }

  const weightBigInt = typeof weight === 'bigint' ? weight : BigInt(weight);

  if (weightBigInt <= 0n || weightBigInt > 100n) {
    throw new Error('Weight must be between 1 and 100');
  }

  console.log('[FHE] Encrypting weight:', {
    weight: weightBigInt.toString(),
    contractAddress,
    userAddress
  });

  try {
    const input = fheInstance.createEncryptedInput(
      getAddress(contractAddress),
      getAddress(userAddress)
    );
    input.add64(weightBigInt);

    const { handles, inputProof } = await input.encrypt();

    const handleHex = bytesToHex(handles[0]) as `0x${string}`;
    const proofHex = bytesToHex(inputProof) as `0x${string}`;

    console.log('[FHE] ✅ Encryption successful');

    return {
      handle: handleHex,
      proof: proofHex
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[FHE] ❌ Encryption failed:', errorMsg);
    throw new Error(`Failed to encrypt weight: ${errorMsg}`);
  }
};
