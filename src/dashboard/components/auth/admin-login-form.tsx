"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginValues = z.infer<typeof adminLoginSchema>;

type AdminLoginFormProps = {
  prefilledEmail?: string;
};

const inputClass =
  "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] font-light text-foreground shadow-none placeholder:text-[11px] placeholder:font-light placeholder:tracking-[0.06em] placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[11px] font-medium tracking-[0.26em] uppercase text-foreground/72"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      {children}
    </p>
  );
}

export function AdminLoginForm({ prefilledEmail }: AdminLoginFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: prefilledEmail ?? "",
      password: "",
    },
  });

  useEffect(() => {
    if (prefilledEmail) form.setValue("email", prefilledEmail);
  }, [prefilledEmail, form]);

  async function onSubmit(values: AdminLoginValues) {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not sign in.";
        toast.error(msg);
        setIsPending(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FieldLabel>Email</FieldLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@…"
                  disabled={isPending}
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage className="pt-1 text-[11px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FieldLabel>Password</FieldLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••"
                  disabled={isPending}
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage className="pt-1 text-[11px]" />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={isPending}
          className="group relative mt-2 w-full overflow-hidden rounded-full border border-primary px-8 py-3 text-[11px] tracking-[0.28em] uppercase text-primary transition-colors duration-300 hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
          />
          <span className="relative flex items-center justify-center gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {isPending ? "Signing in…" : "Sign in"}
          </span>
        </button>
      </form>
    </Form>
  );
}
