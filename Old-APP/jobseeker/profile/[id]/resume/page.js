"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResumeViewer from "@/components/ResumeViewer";
import DashboardHeader from "@/components/DashboardHeader";

export default function JobseekerResumePage({ params }) {
  const { id } = params;
  const [resumeUrl, setResumeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`/api/jobseeker/profile/${id}/resume`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResumeUrl(data.resumeUrl);
        } else {
          setResumeUrl(null);
        }
      } catch (e) {
        setResumeUrl(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!resumeUrl) return <div>Resume not found.</div>;

  return (
    <div>
      <DashboardHeader />
      <main className="max-w-4xl mx-auto p-6">
        <ResumeViewer resumeUrl={resumeUrl} onClose={() => router.back()} />
      </main>
    </div>
  );
}
