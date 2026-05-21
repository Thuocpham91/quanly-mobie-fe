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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import usersApi, { type User } from "../api/users";
import UserModal from "../components/UserModal";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { selectedBranchId } = useBranchContext();

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

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "800",
              marginBottom: "0.25rem",
              letterSpacing: "-0.025em",
            }}
          >
            {t("users.title")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            {t("users.subtitle")}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.25rem",
            boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)",
          }}
        >
          <Plus size={18} />
          {t("users.add_new")}
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: "0",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
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
                padding: "0.75rem 1rem 0.75rem 2.75rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
                outline: "none",
                fontSize: "0.875rem",
                transition: "all 0.2s",
              }}
            />
          </div>
        </div>

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
    </div>
  );
};

export default UsersPage;
