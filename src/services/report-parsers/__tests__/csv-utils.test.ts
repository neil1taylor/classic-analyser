import { describe, it, expect } from 'vitest';
import { isKubeStorage } from '../csv-utils';

describe('isKubeStorage', () => {
  it('returns false for undefined', () => {
    expect(isKubeStorage(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isKubeStorage(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKubeStorage('')).toBe(false);
  });

  it('returns false for non-K8s notes', () => {
    expect(isKubeStorage('some regular notes about this volume')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isKubeStorage(42)).toBe(false);
  });

  it('returns true for notes containing ibm-file-plugin', () => {
    expect(isKubeStorage("{'plugin':'ibm-file-plugin-598d67556b-pz745','region':'us-east'}")).toBe(true);
  });

  it('returns true for notes containing ibm-block-attacher', () => {
    expect(isKubeStorage("{'plugin':'ibm-block-attacher-abc123'}")).toBe(true);
  });

  it('returns true for notes containing ibmcloud-block-storage-plugin', () => {
    expect(isKubeStorage("{'plugin':'ibmcloud-block-storage-plugin-xyz'}")).toBe(true);
  });

  it("returns true for notes containing 'pvc' key", () => {
    expect(isKubeStorage("{'pvc':'my-volume-claim'}")).toBe(true);
  });

  it("returns true for notes containing 'storageclass' key", () => {
    expect(isKubeStorage("{'storageclass':'ibmc-file-bronze'}")).toBe(true);
  });

  it('returns true for real decoded NAS CSV notes', () => {
    const realNotes = "{'plugin':'ibm-file-plugin-598d67556b-pz745','region':'us-east','cluster':'bmfl6auw0qdphvq3oa7g','type':'Endurance','ns':'default','pvc':'grafana-storage-volume','pv':'pvc-8d9869a9-1488-4b03-bbd3-5102e5f3814a','storageclass':'ibmc-file-bronze','reclaim':'Delete'}";
    expect(isKubeStorage(realNotes)).toBe(true);
  });

  it('returns false for notes that mention pvc without single quotes', () => {
    // Ensure we don't false-positive on casual mentions
    expect(isKubeStorage('This volume has pvc attached')).toBe(false);
  });
});
