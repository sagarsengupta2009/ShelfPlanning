import { Observable, throwError, timer } from 'rxjs';
import { mergeMap, finalize } from 'rxjs/operators';

export const genericRetryStrategy = ({
  maxRetryAttempts = 3,
  scalingDuration = 1,
  StatusCodes = []
}: {
  maxRetryAttempts?: number,
  scalingDuration?: number,
  StatusCodes?: number[]
} = {}) => (attempts: Observable<any>) => {
  return attempts.pipe(
    mergeMap((error, i) => {
      const retryAttempt = i + 1;
      // if maximum number of retries have been met
      if (retryAttempt < maxRetryAttempts && StatusCodes.includes(error.status)) {
        return timer(retryAttempt * scalingDuration);
      }
      else {
        return throwError(error);
      }
    }),
    finalize(() => { })
  );
};
