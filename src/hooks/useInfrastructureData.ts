// Unified facade hook over the four domain data contexts
// Provides a consistent interface without merging the separate contexts
import { useData } from '@/contexts/DataContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';
import { usePlatformData } from '@/contexts/PlatformDataContext';
import type { InfrastructureDomain } from '@/contexts/AuthContext';

interface InfrastructureDataResult {
  data: Record<string, unknown[]>;
  isCollecting: boolean;
  status: string;
  collectionDuration: number | null;
}

export function useInfrastructureData(domain: InfrastructureDomain): InfrastructureDataResult {
  const classicCtx = useData();
  const vpcCtx = useVpcData();
  const pvsCtx = usePowerVsData();
  const platformCtx = usePlatformData();

  switch (domain) {
    case 'classic':
      return {
        data: classicCtx.collectedData,
        isCollecting: classicCtx.collectionStatus === 'collecting',
        status: classicCtx.collectionStatus,
        collectionDuration: classicCtx.collectionDuration,
      };
    case 'vpc':
      return {
        data: vpcCtx.vpcCollectedData,
        isCollecting: vpcCtx.vpcCollectionStatus === 'collecting',
        status: vpcCtx.vpcCollectionStatus,
        collectionDuration: vpcCtx.vpcCollectionDuration,
      };
    case 'powervs':
      return {
        data: pvsCtx.pvsCollectedData,
        isCollecting: pvsCtx.pvsCollectionStatus === 'collecting',
        status: pvsCtx.pvsCollectionStatus,
        collectionDuration: pvsCtx.pvsCollectionDuration,
      };
    case 'platform':
      return {
        data: platformCtx.platformCollectedData,
        isCollecting: platformCtx.platformCollectionStatus === 'collecting',
        status: platformCtx.platformCollectionStatus,
        collectionDuration: platformCtx.platformCollectionDuration,
      };
  }
}
