import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginWithGoogle, loginWithApple } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (Platform.OS === 'web') {
      setError('Google sign-in is available on iOS and Android devices');
      return;
    }
    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const AuthSession = await import('expo-auth-session');
      const WebBrowser = await import('expo-web-browser');
      WebBrowser.maybeCompleteAuthSession();

      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const redirectUri = AuthSession.makeRedirectUri();
      const request = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync(discovery);
      if (result.type === 'success' && result.params.id_token) {
        await loginWithGoogle(result.params.id_token);
      } else if (result.type === 'error') {
        setError('Google sign in failed');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Google sign in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    if (Platform.OS !== 'ios') {
      setError('Apple sign-in is only available on iOS devices');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const Apple = await import('expo-apple-authentication');
      const credential = await Apple.signInAsync({
        requestedScopes: [
          Apple.AppleAuthenticationScope.FULL_NAME,
          Apple.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      await loginWithApple(credential.identityToken, fullName || undefined);
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      const message = e instanceof Error ? e.message : 'Apple sign in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[Colors.forestGreen, Colors.charcoal, Colors.charcoal]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="walk" size={40} color={Colors.burntOrange} />
            </View>
            <Text style={styles.logoText}>RuckON</Text>
            <Text style={styles.tagline}>Carry the weight. Own the miles.</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.bone} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={20} color={Colors.bone} />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleAppleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={20} color={Colors.bone} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
            >
              <Text style={styles.switchModeText}>
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "}
              </Text>
              <Text style={styles.switchModeLink}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 42,
    color: Colors.bone,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  formSection: {
    flex: 1,
  },
  formTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 24,
    color: Colors.bone,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(196, 67, 45, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 67, 45, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.bone,
  },
  submitBtn: {
    backgroundColor: Colors.burntOrange,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginHorizontal: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  socialBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.bone,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  switchModeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchModeLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.burntOrange,
  },
});
