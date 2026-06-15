import * as oci from 'oci-sdk';

let client: oci.objectstorage.ObjectStorageClient | null = null;

export const getObjectStorageClient = () => {
    if (!client) {
        if (!process.env.OCI_TENANCY_OCID || !process.env.OCI_USER_OCID || !process.env.OCI_FINGERPRINT || !process.env.OCI_PRIVATE_KEY || !process.env.OCI_REGION || !process.env.OCI_BUCKET_NAME || !process.env.OCI_NAMESPACE) {
            console.warn('OCI credentials missing, storage features disabled');
            return null;
        }
        const provider = new oci.common.SimpleAuthenticationDetailsProvider(
            process.env.OCI_TENANCY_OCID,
            process.env.OCI_USER_OCID,
            process.env.OCI_FINGERPRINT,
            process.env.OCI_PRIVATE_KEY,
            '',
            oci.common.Region.fromRegionId(process.env.OCI_REGION!)
        );
        client = new oci.objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
    }
    return client;
};

export const getPresignedUrl = async (path: string, method: 'PUT' | 'GET') => {
  const ociClient = getObjectStorageClient();
  if (!ociClient) throw new Error('OCI Storage not configured');

  return `https://storage.oraclecloud.com/${process.env.OCI_BUCKET_NAME}/${path}`;
};

export const deleteObject = async (path: string) => {
    const ociClient = getObjectStorageClient();
    if (!ociClient) throw new Error('OCI Storage not configured');

    await ociClient.deleteObject({
        namespaceName: process.env.OCI_NAMESPACE!,
        bucketName: process.env.OCI_BUCKET_NAME!,
        objectName: path
    });
};
