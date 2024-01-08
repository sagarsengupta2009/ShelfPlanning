import { SafePipe } from './safe-html.pipe';

describe('SafeHtmlPipe', () => {
  let sanitizerSpy: jasmine.Spy;
  it('create an instance', () => {
    const pipe = new SafePipe(sanitizerSpy as any);
    expect(pipe).toBeTruthy();
  });
});
