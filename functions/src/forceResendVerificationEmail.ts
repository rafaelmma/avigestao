import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const forceResendVerificationEmail = functions.https.onRequest(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).send('Email is required');
    return;
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);

    if (!userRecord.emailVerified) {
      await admin.auth().generateEmailVerificationLink(email);
      res.status(200).send(`Verification email resent to ${email}`);
    } else {
      res.status(200).send('Email is already verified');
    }
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).send('Failed to resend verification email');
  }
});