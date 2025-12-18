"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getUserWorkspaces, createWorkspace } from "@/lib/workspace";
import { useRouter } from "next/navigation";
import { LogIn, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const [initLoading, setInitLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (user) {
      handleUserRedirect();
    }
  }, [user]);

  const handleUserRedirect = async () => {
    if (!user) return;
    setInitLoading(true);
    try {
      const workspaces = await getUserWorkspaces(user.uid);
      if (workspaces.length > 0) {
        // Go to first workspace
        router.push(`/workspace/${workspaces[0].id}`);
      } else {
        // Create default workspace
        const newWs = await createWorkspace(user.uid, `${user.displayName || 'User'}'s Workspace`);
        router.push(`/workspace/${newWs.id}`);
      }
    } catch (e) {
      console.error("Failed to redirect", e);
      setInitLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setAuthLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        toast.success("Account created successfully!");
      } else {
        await signInWithEmail(email, password);
        toast.success("Signed in successfully!");
      }
      // Redirect handled by useEffect
    } catch (error: any) {
      console.error("Auth error:", error);
      let msg = "Authentication failed";
      if (error.code === 'auth/email-already-in-use') msg = "Email already in use";
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password";
      if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters";
      toast.error(msg);
      setAuthLoading(false);
    }
  };

  if (loading || initLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <span className="text-6xl">📝</span>
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">MyArchive Notes</h1>
      <p className="text-xl text-gray-500 max-w-md mb-8">
        Your personal workspace for thoughts, wikis, and projects.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 bg-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 bg-white"
            required
          />
          <button
            type="submit"
            disabled={authLoading}
            className="px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? "Sign Up" : "Sign In"}
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 text-base rounded-xl font-medium hover:bg-gray-50 transition"
        >
          <LogIn size={20} />
          Continue with Google
        </button>

        <p className="text-sm text-gray-500 mt-4">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-1 text-black font-semibold hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
