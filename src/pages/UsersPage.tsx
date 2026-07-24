import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Mail,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import usersApi, { type User } from "../api/users";
import UserModal from "../components/UserModal";
import SearchDrawer from "../components/SearchDrawer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranchContext } from "../context/BranchContext";
import Pagination from "../components/Pagination";
import { type PaginatedResponse } from "../api/client";

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Search Drawer states
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [phoneEmailFilter, setPhoneEmailFilter] = useState("");

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (roleFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (phoneEmailFilter ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
    setPhoneEmailFilter("");
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { selectedBranchId } = useBranchContext();

  // Password change states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ["users", selectedBranchId, page],
    queryFn: () => usersApi.getUsers(selectedBranchId, page, 10),
  });

  const users = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Reset page when branch changes
  React.useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleCreateOrUpdate = (data: any) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("users.delete_confirm"))) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const openChangePasswordModal = (user: User) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Vui lòng nhập đầy đủ các trường bắt buộc!");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu không khớp!");
      return;
    }

    try {
      setIsSavingPassword(true);
      await usersApi.updateUser(passwordUser!.id, {
        password: newPassword,
      });
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error("Lỗi khi đổi mật khẩu user:", err);
      setPasswordError(err.response?.data?.message || "Có lỗi xảy ra khi đổi mật khẩu.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const filteredUsers = users?.filter((u: any) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.includes(q);

    const matchesRole = !roleFilter || u.role === roleFilter;

    const isUserActive = u.isActive !== false;
    const matchesStatus =
      !statusFilter ? true :
      statusFilter === 'active' ? isUserActive :
      statusFilter === 'inactive' ? !isUserActive : true;

    const matchesPhoneEmail =
      !phoneEmailFilter ||
      u.phone?.includes(phoneEmailFilter) ||
      u.email?.toLowerCase().includes(phoneEmailFilter.toLowerCase());

    return matchesSearch && matchesRole && matchesStatus && matchesPhoneEmail;
  });

  return (
    <div className="animate-in fade-in duration-500" style={{ paddingTop: '0.25rem' }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.6rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            {t("users.title")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0, marginTop: "0.1rem" }}>
            {t("users.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ position: "relative", width: "260px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder={t("users.search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.85rem 0.45rem 2.2rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontSize: "0.85rem",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer",
              padding: "0.45rem 0.85rem",
              fontSize: "0.85rem",
              borderRadius: "0.375rem",
              fontWeight: "600",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <SlidersHorizontal size={16} color="#6366f1" />
            Menu tìm kiếm
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: "#6366f1",
                  color: "#ffffff",
                  borderRadius: "9999px",
                  padding: "0.05rem 0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={openCreateModal}
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.95rem",
              fontSize: "0.85rem",
              borderRadius: "0.375rem",
              boxShadow: "0 2px 8px 0 rgba(99, 102, 241, 0.35)",
            }}
          >
            <Plus size={16} />
            {t("users.add_new")}
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: "0",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontSize: "0.875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("users.table_user")}
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontSize: "0.875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("users.table_branch")}
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontSize: "0.875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("users.table_status")}
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontSize: "0.875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("users.table_joined")}
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontSize: "0.875rem",
                    textAlign: "right",
                  }}
                ></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: "4rem", textAlign: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div
                        className="animate-spin"
                        style={{ color: "var(--primary)" }}
                      >
                        <Plus size={32} />
                      </div>
                      <p style={{ color: "#64748b", fontWeight: "500" }}>
                        {t("users.fetching")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers?.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "4rem",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <Search size={40} strokeWidth={1.5} />
                      <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>
                        {t("users.no_users")}
                      </p>
                      <p style={{ fontSize: "0.875rem" }}>
                        {t("users.search_hint")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers?.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "700",
                            fontSize: "1rem",
                          }}
                        >
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "var(--foreground)",
                            }}
                          >
                            {user.fullName}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        {user.userBranchRoles && user.userBranchRoles.length > 0
                          ? user.userBranchRoles.map((ubr) => (
                              <div
                                key={ubr.id}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#94a3b8",
                                  }}
                                >
                                  {ubr.branch?.name}
                                </span>
                                <span
                                  style={{
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "0.5rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    backgroundColor:
                                      ubr.role?.name === "Admin"
                                        ? "#ecfdf5"
                                        : "#f1f5f9",
                                    color:
                                      ubr.role?.name === "Admin"
                                        ? "#10b981"
                                        : "#64748b",
                                    border: `1px solid ${ubr.role?.name === "Admin" ? "#d1fae5" : "#e2e8f0"}`,
                                  }}
                                >
                                  {ubr.role?.name}
                                </span>
                              </div>
                            ))
                          : "---"}
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      {user.isActive ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "#10b981",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                          }}
                        >
                          <CheckCircle size={16} />
                          {t("users.active")}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "#ef4444",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                          }}
                        >
                          <XCircle size={16} />
                          {t("users.inactive")}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "1.25rem 1.5rem",
                        fontSize: "0.875rem",
                        color: "#64748b",
                      }}
                    >
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td
                      style={{ padding: "1.25rem 1.5rem", textAlign: "right" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          onClick={() => openEditModal(user)}
                          title="Sửa thông tin"
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "transparent",
                            color: "#64748b",
                            borderRadius: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f1f5f9")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => openChangePasswordModal(user)}
                          title="Đổi mật khẩu"
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "transparent",
                            color: "#d97706",
                            borderRadius: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fef3c7")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Key size={18} />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/admin/roles?userId=${user.id}`)
                          }
                          title="Phân quyền nhanh"
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "transparent",
                            color: "#f97316",
                            borderRadius: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fff7ed")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Shield size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          title="Xóa nhân viên"
                          style={{
                            padding: "0.5rem",
                            backgroundColor: "transparent",
                            color: "#ef4444",
                            borderRadius: "0.5rem",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fef2f2")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            totalItems={meta.total}
          />
        )}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        isLoading={createMutation.isPending || updateMutation.isPending}
        user={selectedUser}
      />

      {/* Modal Đổi mật khẩu */}
      {isPasswordModalOpen && passwordUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            padding: "1rem",
          }}
          onClick={() => !isSavingPassword && setIsPasswordModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "400px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                Đổi Mật Khẩu
              </h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isSavingPassword}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  color: "#64748b",
                  backgroundColor: "transparent",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f1f5f9")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleChangePassword} style={{ padding: "1.5rem" }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Tài khoản:
                  </div>
                  <div style={{ fontWeight: "600", color: "var(--foreground)" }}>
                    {passwordUser.fullName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {passwordUser.email}
                  </div>
                </div>

                {passwordError && (
                  <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: "500" }}>
                    {passwordSuccess}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    placeholder="Xác nhận mật khẩu mới..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    backgroundColor: "white",
                    fontWeight: "600",
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="btn-primary"
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isSavingPassword ? 0.7 : 1,
                  }}
                >
                  {isSavingPassword && (
                    <span className="animate-spin" style={{ display: "inline-block" }}>
                      🌀
                    </span>
                  )}
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Tìm kiếm người dùng"
        subtitle="Lọc danh sách người dùng theo vai trò, trạng thái, SĐT/Email"
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        onApply={() => setIsSearchDrawerOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Từ khóa tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Họ tên, email, tên đăng nhập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Vai trò (Role)
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả vai trò --</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="manager">Quản lý (Manager)</option>            <option value="staff">Nhân viên (Staff)</option>
            <option value="user">Người dùng (User)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Trạng thái tài khoản
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa / Tạm dừng</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Số điện thoại / Email
          </label>
          <input
            type="text"
            placeholder="Lọc theo SĐT hoặc Email..."
            value={phoneEmailFilter}
            onChange={(e) => setPhoneEmailFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
      </SearchDrawer>
    </div>
  );
};

export default UsersPage;
