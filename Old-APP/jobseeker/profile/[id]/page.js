"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";

export default function JobseekerProfilePage({ params }) {
  const { id } = params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`/api/jobseeker/profile/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found.</div>;

  return (
    <div>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Jobseeker Profile</h2>
        <div className="bg-white rounded shadow p-4">
          <p><b>Name:</b> {profile.first_name} {profile.last_name}</p>
          <p><b>Email:</b> {profile.account_email}</p>
          <p><b>Phone:</b> {profile.account_phone}</p>
          <p><b>Location:</b> {profile.premise_name}, {profile.street_name}, {profile.barangay_name}, {profile.city_name}</p>
          <p><b>Nationality:</b> {profile.nationality_name}</p>
          {/* Add more fields as needed */}
        </div>
        <button
          className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => router.push(`/jobseeker/profile/${id}/resume`)}
        >
          View Resume
        </button>
      </main>
    </div>
  );
}
