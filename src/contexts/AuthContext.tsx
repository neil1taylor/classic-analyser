import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AccountInfo } from '@/types/resources';
import { validateApiKey } from '@/services/api';
import { validateVpcApiKey } from '@/services/vpc-api';
import { validatePowerVsApiKey } from '@/services/powervs-api';
import {
  exchangePasscodeForTokens,
  refreshAccessToken,
  revokeToken,
  validateIamToken,
} from '@/services/oauth';
import { createLogger } from '@/utils/logger';

const log = createLogger('Auth');

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

export type InfrastructureDomain = 'classic' | 'vpc' | 'powervs';
export type InfrastructureMode = InfrastructureDomain[];

interface AuthContextValue {
  apiKey: string | null;
  iamToken: string | null;
  authMode: 'apikey' | 'iam' | null;
  accountInfo: AccountInfo | null;
  isAuthenticated: boolean;
  infrastructureMode: InfrastructureMode | null;
  login: (apiKey: string) => Promise<InfrastructureMode>;
  loginWithPasscode: (passcode: string) => Promise<void>;
  logout: () => void;
  setImportedAccountInfo: (info: Partial<AccountInfo>, mode?: InfrastructureMode) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [infrastructureMode, setInfrastructureMode] = useState<InfrastructureMode | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iamToken, setIamToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [authMode, setAuthMode] = useState<'apikey' | 'iam' | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthenticated = (apiKey !== null || iamToken !== null) && accountInfo !== null;

  const logout = useCallback(() => {
    log.info('User logged out');
    if (refreshToken) {
      revokeToken(refreshToken);
    }
    setApiKey(null);
    setIamToken(null);
    setRefreshToken(null);
    setTokenExpiry(null);
    setAuthMode(null);
    setAccountInfo(null);
    setInfrastructureMode(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, [refreshToken]);

  const resetInactivityTimer = useCallback(() => {
    if (!apiKey && !iamToken) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      log.warn('Session expired due to inactivity');
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [apiKey, iamToken, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'keydown', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach((event) => window.addEventListener(event, handler));
    resetInactivityTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const login = useCallback(async (key: string): Promise<InfrastructureMode> => {
    log.info('Attempting login with parallel Classic + VPC + PowerVS validation');

    const [classicResult, vpcResult, powerVsResult] = await Promise.allSettled([
      validateApiKey(key),
      validateVpcApiKey(key),
      validatePowerVsApiKey(key),
    ]);

    const classicOk = classicResult.status === 'fulfilled';
    const vpcOk = vpcResult.status === 'fulfilled';
    const powerVsOk = powerVsResult.status === 'fulfilled' && powerVsResult.value?.valid === true;

    if (!classicOk && !vpcOk && !powerVsOk) {
      const classicErr = classicResult.status === 'rejected' ? classicResult.reason : new Error('Classic validation failed');
      throw classicErr;
    }

    const mode: InfrastructureMode = [];
    let info: AccountInfo;

    if (classicOk) {
      mode.push('classic');
      info = classicResult.value;
    } else {
      info = {
        id: 0,
        companyName: 'IBM Cloud Account',
        email: '',
        firstName: '',
        lastName: '',
      };
    }

    if (vpcOk) {
      mode.push('vpc');
      const vpcAccount = vpcResult.value.account;
      if (vpcAccount) {
        if (!info.ibmCloudAccountId && vpcAccount.ibmCloudAccountId) {
          info.ibmCloudAccountId = vpcAccount.ibmCloudAccountId;
        }
        if (!info.ibmCloudAccountName && vpcAccount.ibmCloudAccountName) {
          info.ibmCloudAccountName = vpcAccount.ibmCloudAccountName;
        }
      }
      if (!classicOk) {
        info.companyName = vpcAccount?.ibmCloudAccountName || 'VPC Account';
      }
    }

    if (powerVsOk) {
      mode.push('powervs');
      const pvsAccount = powerVsResult.value.account;
      if (pvsAccount) {
        if (!info.ibmCloudAccountId && pvsAccount.ibmCloudAccountId) {
          info.ibmCloudAccountId = pvsAccount.ibmCloudAccountId;
        }
        if (!info.ibmCloudAccountName && pvsAccount.ibmCloudAccountName) {
          info.ibmCloudAccountName = pvsAccount.ibmCloudAccountName;
        }
      }
      if (!classicOk && !vpcOk) {
        info.companyName = pvsAccount?.ibmCloudAccountName || 'PowerVS Account';
      }
    }

    setApiKey(key);
    setAuthMode('apikey');
    setAccountInfo(info);
    setInfrastructureMode(mode);
    log.info(`Login successful — mode: [${mode.join(', ')}], account: ${info.companyName}`);
    return mode;
  }, []);

  const loginWithPasscode = useCallback(async (passcode: string) => {
    log.info('Exchanging passcode for IAM tokens');
    const tokens = await exchangePasscodeForTokens(passcode);
    const validation = await validateIamToken(tokens.access_token);

    if (!validation.valid) {
      throw new Error('IAM token validation failed');
    }

    setIamToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    setTokenExpiry(Date.now() + tokens.expires_in * 1000);
    setAuthMode('iam');
    setAccountInfo(validation.account as AccountInfo);
    setInfrastructureMode(validation.infrastructureMode as InfrastructureMode);
    log.info(`Passcode login successful — mode: [${validation.infrastructureMode.join(', ')}]`);
  }, []);

  const setImportedAccountInfo = useCallback((info: Partial<AccountInfo>, mode: InfrastructureMode = ['classic', 'vpc']) => {
    setAccountInfo({
      id: info.id ?? 0,
      companyName: info.companyName ?? 'Imported',
      email: info.email ?? '',
      firstName: info.firstName ?? '',
      lastName: info.lastName ?? '',
      ...(info.ibmCloudAccountId && { ibmCloudAccountId: info.ibmCloudAccountId }),
      ...(info.ibmCloudAccountName && { ibmCloudAccountName: info.ibmCloudAccountName }),
    });
    setInfrastructureMode(mode);
    log.info('Set imported account info:', info.companyName ?? 'unknown', 'mode:', mode);
  }, []);

  useEffect(() => {
    if (!iamToken || !refreshToken || !tokenExpiry) return;

    const refreshIn = tokenExpiry - Date.now() - 5 * 60 * 1000;
    if (refreshIn <= 0) {
      refreshAccessToken(refreshToken)
        .then((tokens) => {
          setIamToken(tokens.access_token);
          if (tokens.refresh_token) setRefreshToken(tokens.refresh_token);
          setTokenExpiry(Date.now() + tokens.expires_in * 1000);
          log.info('IAM token refreshed');
        })
        .catch((err) => {
          log.error('Token refresh failed, logging out', err);
          logout();
        });
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken(refreshToken)
        .then((tokens) => {
          setIamToken(tokens.access_token);
          if (tokens.refresh_token) setRefreshToken(tokens.refresh_token);
          setTokenExpiry(Date.now() + tokens.expires_in * 1000);
          log.info('IAM token refreshed');
        })
        .catch((err) => {
          log.error('Token refresh failed, logging out', err);
          logout();
        });
    }, refreshIn);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [iamToken, refreshToken, tokenExpiry, logout]);

  const value: AuthContextValue = {
    apiKey,
    iamToken,
    authMode,
    accountInfo,
    isAuthenticated,
    infrastructureMode,
    login,
    loginWithPasscode,
    logout,
    setImportedAccountInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
