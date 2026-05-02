"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, User, Heart, Lock, Eye, EyeOff } from "lucide-react";
import type { PublicWeddingPayload } from "@/lib/wedding/queries";
import {
  SettingsWeddingPage,
  WEDDING_SETTINGS_FORM_ID,
} from "@/dashboard/pages/settings-wedding";
import {
  formInputClass,
  FormCollapsibleSection,
  FormFieldLabel,
  SettingsFillButton,
} from "@/dashboard/pages/settings/settings-form-primitives";
import { cn } from "@/lib/utils";

type Props = {
  weddingData: PublicWeddingPayload;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  defaultTab?: string;
};

function formatProfileApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return "Something went wrong";
}

function AccountSettingsInner({
  weddingData,
  userName,
  userEmail,
  userPhone,
  defaultTab = "account",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const [weddingSaving, setWeddingSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const onWeddingSavingChange = useCallback((saving: boolean) => {
    setWeddingSaving(saving);
  }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(t === "wedding" ? "wedding" : "account");
  }, [searchParams]);

  const onTabChange = useCallback(
    (value: string) => {
      setTab(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === "wedding") params.set("tab", "wedding");
      else params.delete("tab");
      const q = params.toString();
      router.replace(q ? `/admin/settings/account?${q}` : "/admin/settings/account", { scroll: false });
    },
    [router, searchParams],
  );

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("accName"),
          email: fd.get("accEmail"),
          phone: fd.get("accPhone") ?? "",
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        toast.error(formatProfileApiError(body.error));
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        toast.error(formatProfileApiError(body.error));
        return;
      }
      toast.success("Password updated");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm font-light text-muted-foreground">
          Your login details and your public invitation.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 w-full flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <TabsList className="h-11 w-full max-w-md shrink-0 rounded-full border border-border/60 bg-muted/40 p-1">
            <TabsTrigger
              value="account"
              className="flex-1 gap-2 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4 opacity-70" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="wedding"
              className="flex-1 gap-2 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Heart className="h-4 w-4 opacity-70" />
              My Wedding
            </TabsTrigger>
          </TabsList>
          {tab === "wedding" && (
            <SettingsFillButton
              type="submit"
              form={WEDDING_SETTINGS_FORM_ID}
              disabled={weddingSaving}
              className="w-full sm:w-auto"
            >
              <Save className="h-3.5 w-3.5" />
              {weddingSaving ? "Saving…" : "Save all"}
            </SettingsFillButton>
          )}
        </div>

        <TabsContent value="account" className="mt-6">
          <div className="mx-auto w-full max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <form onSubmit={handleProfileSubmit}>
                <FormCollapsibleSection
                  id="profile-information"
                  icon={<User className="h-4 w-4" />}
                  label="Your information"
                  defaultOpen
                >
                  <p className="text-[13px] font-light leading-relaxed text-muted-foreground/80">
                    Used to sign in and shown in the dashboard. Changing your email updates how you log in.
                  </p>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8">
                    <div className="sm:col-span-2">
                      <FormFieldLabel>Full name</FormFieldLabel>
                      <Input
                        id="accName"
                        name="accName"
                        defaultValue={userName}
                        required
                        className={formInputClass}
                        autoComplete="name"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FormFieldLabel>Email</FormFieldLabel>
                      <Input
                        id="accEmail"
                        name="accEmail"
                        defaultValue={userEmail}
                        type="email"
                        required
                        className={formInputClass}
                        autoComplete="email"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FormFieldLabel optional>Phone</FormFieldLabel>
                      <Input
                        id="accPhone"
                        name="accPhone"
                        defaultValue={userPhone ?? ""}
                        type="tel"
                        className={formInputClass}
                        autoComplete="tel"
                        placeholder="+855 …"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <SettingsFillButton type="submit" disabled={saving}>
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "Saving…" : "Save profile"}
                    </SettingsFillButton>
                  </div>
                </FormCollapsibleSection>
              </form>

              <form onSubmit={handlePasswordSubmit}>
                <FormCollapsibleSection
                  id="profile-password"
                  icon={<Lock className="h-4 w-4" />}
                  label="Password"
                >
                  <p className="text-[13px] font-light leading-relaxed text-muted-foreground/80">
                    At least 8 characters. You stay signed in after updating your password.
                  </p>
                  <div>
                    <FormFieldLabel>Current password</FormFieldLabel>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPw ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        className={cn(formInputClass, "pr-10")}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCurrentPw((v) => !v)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={showCurrentPw ? "Hide password" : "Show password"}
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8">
                    <div>
                      <FormFieldLabel>New password</FormFieldLabel>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPw ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className={cn(formInputClass, "pr-10")}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPw((v) => !v)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={showNewPw ? "Hide password" : "Show password"}
                        >
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <FormFieldLabel>Confirm new password</FormFieldLabel>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPw ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          className={cn(formInputClass, "pr-10")}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPw((v) => !v)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={showConfirmPw ? "Hide password" : "Show password"}
                        >
                          {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <SettingsFillButton type="submit" disabled={savingPassword}>
                      <Lock className="h-3.5 w-3.5" />
                      {savingPassword ? "Updating…" : "Update password"}
                    </SettingsFillButton>
                  </div>
                </FormCollapsibleSection>
              </form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wedding" className="mt-6 min-h-0 pb-10">
          <SettingsWeddingPage data={weddingData} onSavingChange={onWeddingSavingChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AccountSettingsClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-full max-w-md animate-pulse rounded-full bg-muted" />
        </div>
      }
    >
      <AccountSettingsInner {...props} />
    </Suspense>
  );
}
