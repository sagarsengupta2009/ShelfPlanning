import { GridColumnFormatterPipe } from './grid-column-formatter.pipe';

describe('GridColumnFormatterPipe', () => {
  let intlSpy: jasmine.Spy;
  it('create an instance', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    expect(pipe).toBeTruthy();
  });

  it('should return empty value on undifined', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    expect(pipe.transform(null, {}, '')).toBe('');
  });

  it('should return string type value if column type is string', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'string',
    };
    expect(pipe.transform(`test`, columns)).toBe(`<div style='text-align:left'>test</div>`);
  });

  it('should return string type value with "none" if column type is Number', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'number',
    };
    expect(pipe.transform(`0`, columns)).toBe(`<div style='text-align:right;display:none'>0</div>`);
  });
  it('should return string type value if column type is Number', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'number',
    };
    expect(pipe.transform(`33`, columns)).toBe(`<div style='text-align:right;display:'>33</div>`);
  });

  it('should return string type value if column type is float', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'float',
    };
    expect(pipe.transform(`33`, columns)).toBe(`<div style='text-align:right;display:'>33.00</div>`);
  });

  it('should return string type value if column type is Boolean', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'boolean',
    };
    expect(pipe.transform(`123`, columns)).toBe(`Yes`);
  });

  it('should return string type value if column type is Custom', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'custom',
    };
    expect(pipe.transform(`123`, columns)).toBe(`123`);
  });

  it('should return string type value if column type is plain', () => {
    const pipe = new GridColumnFormatterPipe(intlSpy as any);
    const columns = {
      type: 'plain',
    };
    expect(pipe.transform(`/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/`, columns, 'plain')).toBe(`/^(d{1,2})/(d{1,2})/(d{4})$/`);
  });
});
