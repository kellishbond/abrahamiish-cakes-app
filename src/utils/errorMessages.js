const ERROR_CODE_MESSAGES = {
  'auth/email-already-in-use': 'That email is already in use. Try signing in instead.',
  'auth/invalid-email': 'That email address does not look right. Please check it and try again.',
  'auth/invalid-credential': 'Your email or password is incorrect. Please try again.',
  'auth/user-not-found': 'We could not find an account with those details.',
  'auth/wrong-password': 'Your email or password is incorrect. Please try again.',
  'auth/too-many-requests': 'Too many attempts were made. Please wait a moment and try again.',
  'auth/network-request-failed': 'We could not reach the internet. Please check your connection and try again.',
  'storage/unauthorized': 'Image upload is not allowed right now. Please check your storage setup and try again.',
  'storage/canceled': 'Image upload was canceled before it finished.',
  'storage/unknown': 'We could not upload that image right now. Please try again or use an image URL instead.',
  'permission-denied': 'You do not have permission to do that right now.',
  'unavailable': 'This service is temporarily unavailable. Please try again in a moment.',
};

function cleanMessage(message = '') {
  return String(message)
    .replace(/^Firebase:\s*/i, '')
    .replace(/\s*\(.*?\)\s*$/g, '')
    .trim();
}

export function getFriendlyErrorMessage(error, fallbackMessage) {
  const code = error?.code;
  const rawMessage = cleanMessage(error?.message || '');

  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  if (
    rawMessage &&
    /network|internet|fetch|offline|timed out|timeout/i.test(rawMessage)
  ) {
    return 'We could not reach the internet. Please check your connection and try again.';
  }

  if (
    rawMessage &&
    /permission|unauthorized|forbidden|denied/i.test(rawMessage)
  ) {
    return 'You do not have permission to do that right now.';
  }

  if (rawMessage && /not found|no such/i.test(rawMessage)) {
    return 'We could not find what you were looking for. Please try again.';
  }

  return fallbackMessage || 'Something went wrong. Please try again.';
}

export function getFriendlyFetchMessage(error, fallbackMessage) {
  return getFriendlyErrorMessage(
    error,
    fallbackMessage || 'We could not load this right now. Please try again shortly.'
  );
}
