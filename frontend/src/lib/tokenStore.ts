let accessToken = '';

export const tokenStore = {
  getAccessToken(): string {
    return accessToken;
  },
  setAccessToken(token: string): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = '';
  },
};
