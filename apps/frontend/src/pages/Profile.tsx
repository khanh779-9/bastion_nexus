import React, { useEffect, useState, useContext } from "react";
import { User as UserIcon } from "lucide-react";
import { api } from "@/api/client";
import { ThemeContext } from "@/components/ThemeContext";
import { useTranslate } from "@/locales";
import { getThemeColor } from "../themeColors";
import { showToast } from "@/components/toastService";

interface UserProfileData {
  email: string;
  created_at: string;
}

interface ProfileDetails {
  display_name: string;
  avatar_url: string;
  phone: string;
  birthday: string;
  bio: string;
}

export default function Profile() {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslate();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [profile, setProfile] = useState<ProfileDetails>({
    display_name: "",
    avatar_url: "",
    phone: "",
    birthday: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api
        .get("/user/profile")
        .then((res) => res.data)
        .catch(() => null),
      api
        .get("/user/profile-detail")
        .then((res) => res.data)
        .catch(() => null),
    ]).then(([userData, profileData]) => {
      setUser(userData);
      setProfile({
        display_name: profileData?.display_name || "",
        avatar_url: profileData?.avatar_url || "",
        phone: profileData?.phone || "",
        birthday: profileData?.birthday || "",
        bio: profileData?.bio || "",
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div
        className={"p-8 text-center " + getThemeColor(theme, "textSecondary")}
      >
        {t('profile.loading')}
      </div>
    );
  }

  const email = user?.email || "";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : t('profile.notAvailable');
  const displayName = profile.display_name || email;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const safeProfile = {
        ...profile,
        display_name: (profile.display_name || "").trim() || "User",
        avatar_url: profile.avatar_url?.trim() ? profile.avatar_url.trim() : null,
        phone: profile.phone?.trim() ? profile.phone.trim() : null,
        birthday: profile.birthday?.trim() ? profile.birthday.trim() : null,
        bio: profile.bio?.trim() ? profile.bio.trim() : null,
      };

      console.log(
        "POST to:",
        api.defaults.baseURL + "/user/profile-detail",
        safeProfile
      );
      
      const res = await api.post("/user/profile-detail", safeProfile);
      if (res.data?.created) {
        showToast(t('profile.created'), "success");
      } else if (res.data?.updated) {
        showToast(t('profile.updated'), "success");
      } else {
        showToast(t('profile.saved'), "success");
      }
    } catch (err: any) {
      console.error("Profile update error:", err, err?.response);
      showToast(
        err?.response?.data?.error ||
          `${t('profile.saveFailed')} (${err?.response?.status || ""})`,
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={"min-h-screen " + getThemeColor(theme, "background")}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20 flex justify-center" >
        <div
          className={
            "rounded-2xl shadow-lg max-w-full md:max-w-3xl lg:max-w-4xl min-w-0 overflow-hidden flex flex-col w-full " +
            getThemeColor(theme, "panel") +
            " " +
            getThemeColor(theme, "border")
          }
          style={{ minHeight: "500px" }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-8 pb-0">
            <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-1/3">
              <div
                className={
                  "w-24 h-24 rounded-full flex items-center justify-center text-5xl overflow-hidden " +
                  getThemeColor(theme, "accent") +
                  " " +
                  getThemeColor(theme, "accentText")
                }
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <UserIcon size={56} />
                )}
              </div>
              <input
                type="text"
                name="avatar_url"
                value={profile.avatar_url}
                onChange={handleChange}
                placeholder={t('profile.avatarPlaceholder')}
                className={
                  "w-full text-xs text-center md:text-left bg-transparent border-b focus:outline-none " +
                  getThemeColor(theme, "textSecondary") +
                  " " +
                  getThemeColor(theme, "border") +
                  " focus:" +
                  getThemeColor(theme, "accent")
                }
              />
              <div
                className={
                  "text-base font-semibold mt-2 " + getThemeColor(theme, "text")
                }
              >
                {displayName}
              </div>
              <div
                className={"text-sm " + getThemeColor(theme, "textSecondary")}
              >
                {email}
              </div>
              <div
                className={
                  "text-xs mt-1 " + getThemeColor(theme, "textSecondary")
                }
              >
                {t('profile.memberSince')}: {createdAt}
              </div>
            </div>
            <form
              onSubmit={handleSave}
              className="flex-1 w-full md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={
                      "block text-sm font-medium mb-2 " +
                      getThemeColor(theme, "textSecondary")
                    }
                  >
                    {t('profile.displayName')}
                  </label>
                  <input
                    type="text"
                    name="display_name"
                    value={profile.display_name}
                    onChange={handleChange}
                    placeholder={t('profile.displayNamePlaceholder')}
                    className={
                      "w-full px-3 py-2 rounded-md border text-sm " +
                      getThemeColor(theme, "input")
                    }
                  />
                </div>
                <div>
                  <label
                    className={
                      "block text-sm font-medium mb-2 " +
                      getThemeColor(theme, "textSecondary")
                    }
                  >
                    {t('profile.phone')}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder={t('profile.phonePlaceholder')}
                    className={
                      "w-full px-3 py-2 rounded-md border text-sm " +
                      getThemeColor(theme, "input")
                    }
                  />
                </div>
                <div>
                  <label
                    className={
                      "block text-sm font-medium mb-2 " +
                      getThemeColor(theme, "textSecondary")
                    }
                  >
                    {t('profile.birthday')}
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={profile.birthday}
                    onChange={handleChange}
                    className={
                      "w-full px-3 py-2 rounded-md border text-sm " +
                      getThemeColor(theme, "input")
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    className={
                      "block text-sm font-medium mb-2 " +
                      getThemeColor(theme, "textSecondary")
                    }
                  >
                    {t('profile.bio')}
                  </label>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    rows={3}
                    placeholder={t('profile.bioPlaceholder')}
                    className={
                      "w-full px-3 py-2 rounded-md border text-sm " +
                      getThemeColor(theme, "input")
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className={
                  "w-full mt-6 py-2.5 px-4 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed " +
                  getThemeColor(theme, "button")
                }
              >
                {saving ? t('profile.saving') : t('profile.saveProfile')}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
