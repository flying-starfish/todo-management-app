// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// テスト全体でconsole.errorを抑制
// エラーハンドリングのテストで意図的なエラーログを非表示にする
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // 特定のエラーメッセージのみ抑制したい場合は、ここでフィルタリング可能
    // 例: Reactの警告は表示したい場合
    // if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    //   originalError(...args);
    // }
    
    // すべてのconsole.errorを抑制
    return;
  };
});

afterAll(() => {
  console.error = originalError;
});
