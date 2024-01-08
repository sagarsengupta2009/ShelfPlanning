import { SafeIframeUrlPipe } from './safe-iframe-url.pipe';

describe('SafeIframeUrlPipe', () => {
  let sanitizerSpy: jasmine.Spy;
  it('create an instance', () => {
    const pipe = new SafeIframeUrlPipe(sanitizerSpy as any);
    expect(pipe).toBeTruthy();
  });
});
