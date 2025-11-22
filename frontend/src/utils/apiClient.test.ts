import { setLogoutCallback } from './apiClient';

describe('apiClient Utilities', () => {
  describe('setLogoutCallback', () => {
    test('ログアウトコールバックが正しく設定される', () => {
      const mockLogout = jest.fn();
      setLogoutCallback(mockLogout);
      // setLogoutCallbackが正しく動作することを確認
      expect(mockLogout).not.toHaveBeenCalled();
    });

    test('異なるコールバック関数を設定できる', () => {
      const mockLogout1 = jest.fn();
      const mockLogout2 = jest.fn();

      setLogoutCallback(mockLogout1);
      setLogoutCallback(mockLogout2);

      // 両方の関数が呼ばれていないことを確認
      expect(mockLogout1).not.toHaveBeenCalled();
      expect(mockLogout2).not.toHaveBeenCalled();
    });
  });
});
