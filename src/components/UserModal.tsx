import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Loader2,
  Search,
} from "lucide-react";
import { type User } from "../api/users";
import { useQuery } from "@tanstack/react-query";
import branchesApi from "../api/branches";
import customersApi, { type Customer } from "../api/customers";
import { getRoles } from "../api/roles";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  user?: User | null;
  initialBranchId?: string;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  user,
  initialBranchId,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    isActive: true,
    role: "receptionist",
    branchRoleAssignments: [] as { branchId: string; roleId: string }[],
    gender: "Nam",
    dateOfBirth: "",
    idCard: "",
    phone: "",
    hireDate: "",
    specialties: "",
    englishProficiency: false,
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  const { data: paginatedBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches(1, 50),
    enabled: isOpen,
  });

  const { data: customerData } = useQuery({
    queryKey: ["customersSearch", customerSearch],
    queryFn: () => customersApi.searchCustomers(customerSearch),
    enabled: isOpen && formData.role === "customer" && customerSearch.length > 0,
  });

  const customers = customerData?.data || [];

  const branches = paginatedBranches?.data || [];

  const ROLE_LABEL_MAP: Record<string, string> = {
    Admin: "👑 Admin",
    "Quản lý": "🏢 Quản lý",
    "Nhân viên": "👤 Nhân viên",
    Vet: "🩺 Bác sĩ thú y",
    Receptionist: "👤 Lễ tân",
  };

  const { data: allRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: isOpen,
  });

  // Hiển thị TẤT CẢ vai trò - không lọc cứng nữa
  const roles = allRoles;

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        role:
          user.userBranchRoles?.[0]?.role?.name.toLowerCase() || "receptionist",
        branchRoleAssignments:
          user.userBranchRoles?.map((ubr) => ({
            branchId: ubr.branchId,
            roleId: ubr.roleId,
          })) || [],
        isActive: user.isActive,
        gender: user.gender || "Nam",
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
        idCard: user.idCard || "",
        phone: user.phone || "",
        hireDate: user.hireDate
          ? new Date(user.hireDate).toISOString().split("T")[0]
          : "",
        specialties: user.specialties || "",
        englishProficiency: user.englishProficiency || false,
      });
    } else {
      setFormData({
        fullName: "",
        email: "",
        role: "receptionist",
        branchRoleAssignments: initialBranchId
          ? [{ branchId: initialBranchId, roleId: "" }]
          : [],
        isActive: true,
        gender: "Nam",
        dateOfBirth: "",
        idCard: "",
        phone: "",
        hireDate: "",
        specialties: "",
        englishProficiency: false,
      });
    }
  }, [user, isOpen, initialBranchId]);

  if (!isOpen) return null;

  const handleBranchToggle = (branchId: string) => {
    setFormData((prev) => {
      const isSelected = prev.branchRoleAssignments.some(
        (a) => a.branchId === branchId,
      );
      if (isSelected) {
        return {
          ...prev,
          branchRoleAssignments: prev.branchRoleAssignments.filter(
            (a) => a.branchId !== branchId,
          ),
        };
      } else {
        return {
          ...prev,
          branchRoleAssignments: [
            ...prev.branchRoleAssignments,
            { branchId, roleId: roles[0]?.id || "" },
          ],
        };
      }
    });
  };

  const handleSelectAllBranches = (checked: boolean) => {
    if (checked) {
      const defaultRoleId = roles[0]?.id || "";
      const allAssignments = branches.map((b) => {
        const existing = formData.branchRoleAssignments.find(
          (a) => a.branchId === b.id,
        );
        return existing || { branchId: b.id, roleId: defaultRoleId };
      });
      setFormData((prev) => ({
        ...prev,
        branchRoleAssignments: allAssignments,
      }));
    } else {
      setFormData((prev) => ({ ...prev, branchRoleAssignments: [] }));
    }
  };

  const isAllSelected =
    branches.length > 0 &&
    formData.branchRoleAssignments.length === branches.length;

  const handleRoleChange = (branchId: string, roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      branchRoleAssignments: prev.branchRoleAssignments.map((a) =>
        a.branchId === branchId ? { ...a, roleId } : a,
      ),
    }));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      fullName: customer.fullName,
      email: customer.email || prev.email,
    }));
    setShowCustomerList(false);
    setCustomerSearch("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "500px",
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
            {user ? t("users.modal_edit") : t("users.modal_add")}
          </h2>
          <button
            onClick={onClose}
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
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* Customer Link (Only for new Customer users) */}
            {!user && formData.role === "customer" && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "rgba(99, 102, 241, 0.05)",
                  borderRadius: "0.75rem",
                  border: "1px dashed var(--primary)",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "var(--primary)",
                  }}
                >
                  Lấy thông tin từ khách hàng có sẵn
                </label>
                <div style={{ position: "relative" }}>
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
                    placeholder="Tìm tên hoặc số điện thoại..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerList(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                  />
                  {showCustomerList && customers && customers.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        zIndex: 10,
                        marginTop: "0.25rem",
                        maxHeight: "200px",
                        overflowY: "auto",
                      }}
                    >
                      {customers.map((c: Customer) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          style={{
                            padding: "0.75rem",
                            cursor: "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.125rem",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f8fafc")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <div
                            style={{ fontWeight: "600", fontSize: "0.875rem" }}
                          >
                            {c.fullName}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#64748b" }}
                          >
                            {c.phone} {c.email ? `• ${c.email}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Branch and Role Selection */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <label style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                  Chi nhánh và Vai trò
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    color: "var(--primary)",
                    fontWeight: "600",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAllBranches(e.target.checked)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Chọn tất cả
                </label>
              </div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}
              >
                {branches?.map((b) => {
                  const assignment = formData.branchRoleAssignments.find(
                    (a) => a.branchId === b.id,
                  );
                  const isSelected = !!assignment;

                  return (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          cursor: "pointer",
                          flex: 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleBranchToggle(b.id)}
                          style={{
                            accentColor: "var(--primary)",
                            width: "1.125rem",
                            height: "1.125rem",
                          }}
                        />
                        <span
                          style={{
                            fontWeight: isSelected ? "600" : "400",
                            color: isSelected ? "var(--primary)" : "#64748b",
                          }}
                        >
                          {b.name}
                        </span>
                      </label>

                      {isSelected && (
                        <select
                          value={assignment.roleId}
                          onChange={(e) =>
                            handleRoleChange(b.id, e.target.value)
                          }
                          style={{
                            padding: "0.4rem 0.75rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--border)",
                            fontSize: "0.875rem",
                            outline: "none",
                            backgroundColor: "white",
                            minWidth: "150px",
                          }}
                        >
                          <option value="">-- Chọn vai trò --</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {ROLE_LABEL_MAP[r.name] ?? r.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2-Column Grid for Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Full Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ color: "#ef4444" }}>*</span>{" "}
                    {t("users.label_fullname")}
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Nhập họ tên..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Ngày sinh */}
                {formData.role !== "customer" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Ngày sinh:
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        outline: "none",
                        color: formData.dateOfBirth ? "inherit" : "#94a3b8",
                      }}
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ color: "#ef4444" }}>*</span> Email:
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Nhập email..."
                    disabled={!!user} // Email usually shouldn't change
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      outline: "none",
                      backgroundColor: user ? "#f8fafc" : "white",
                    }}
                  />
                </div>

                {/* Ngày vào làm */}
                {formData.role !== "customer" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Ngày vào làm:
                    </label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        outline: "none",
                        color: formData.hireDate ? "inherit" : "#94a3b8",
                      }}
                    />
                  </div>
                )}

                {/* Chuyên ngành */}
                {formData.role !== "customer" && (() => {
                  const VET_SPECIALTIES = [
                    "Nội khoa",
                    "Ngoại khoa",
                    "Sản khoa",
                    "Chẩn đoán hình ảnh",
                    "Răng - Hàm - Mặt",
                    "Da liễu",
                    "Nhãn khoa",
                    "Ung bướu",
                    "Tim mạch",
                    "Thần kinh",
                    "Dinh dưỡng & Nội tiết",
                    "Gây mê hồi sức",
                    "Truyền nhiễm",
                    "Chỉnh hình",
                    "Thú y thủy sản",
                  ];
                  const selected = formData.specialties
                    ? formData.specialties.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  const toggleSpecialty = (sp: string) => {
                    const next = selected.includes(sp)
                      ? selected.filter((s) => s !== sp)
                      : [...selected, sp];
                    setFormData((prev) => ({ ...prev, specialties: next.join(", ") }));
                  };
                  return (
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Chuyên ngành:
                      </label>
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: "0.4rem",
                        padding: "0.6rem", borderRadius: "0.5rem",
                        border: "1px solid var(--border)", background: "#f8fafc",
                        maxHeight: "130px", overflowY: "auto",
                      }}>
                        {VET_SPECIALTIES.map((sp) => {
                          const active = selected.includes(sp);
                          return (
                            <button
                              key={sp}
                              type="button"
                              onClick={() => toggleSpecialty(sp)}
                              style={{
                                padding: "0.25rem 0.65rem",
                                borderRadius: "2rem",
                                fontSize: "0.75rem",
                                fontWeight: active ? "700" : "500",
                                cursor: "pointer",
                                border: active ? "none" : "1px solid #cbd5e1",
                                background: active
                                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                                  : "white",
                                color: active ? "white" : "#64748b",
                                boxShadow: active ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                                transition: "all 0.15s",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {active ? "✓ " : ""}{sp}
                            </button>
                          );
                        })}
                      </div>
                      {selected.length > 0 && (
                        <p style={{ fontSize: "0.72rem", color: "#6366f1", marginTop: "0.35rem", fontWeight: "600" }}>
                          Đã chọn: {selected.join(" · ")}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Password Notice */}
                {!user && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      fontWeight: "600",
                      marginTop: "0.5rem",
                    }}
                  >
                    *Lưu ý: Mật khẩu tài khoản sẽ gửi về email đăng ký
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {/* Giới tính */}
                {formData.role !== "customer" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span style={{ color: "#ef4444" }}>*</span> Giới tính:
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        height: "42px",
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Nam"
                          checked={formData.gender === "Nam"}
                          onChange={handleChange}
                          style={{ accentColor: "var(--primary)" }}
                        />{" "}
                        Nam
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Nữ"
                          checked={formData.gender === "Nữ"}
                          onChange={handleChange}
                          style={{ accentColor: "var(--primary)" }}
                        />{" "}
                        Nữ
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Khác"
                          checked={formData.gender === "Khác"}
                          onChange={handleChange}
                          style={{ accentColor: "var(--primary)" }}
                        />{" "}
                        Khác
                      </label>
                    </div>
                  </div>
                )}

                {/* CMND/CCCD */}
                {formData.role !== "customer" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      CMND/CCCD:
                    </label>
                    <input
                      type="text"
                      name="idCard"
                      value={formData.idCard}
                      onChange={handleChange}
                      placeholder="Nhập CMND/CCCD..."
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {/* Số điện thoại */}
                {formData.role !== "customer" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span style={{ color: "#ef4444" }}>*</span> Số điện thoại:
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required={formData.role !== "customer"}
                      placeholder="Nhập số điện thoại..."
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {/* Tiếng Anh */}
                {formData.role !== "customer" && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="englishProficiency"
                        checked={formData.englishProficiency}
                        onChange={handleChange}
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          accentColor: "var(--primary)",
                        }}
                      />
                      <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        Tiếng Anh
                      </span>
                    </label>
                  </div>
                )}

                {/* Status */}
                <div style={{ marginTop: "auto" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "0.25rem",
                        accentColor: "var(--primary)",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
                      {t("users.label_status")}
                    </span>
                  </label>
                </div>
              </div>
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
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "white",
                fontWeight: "600",
              }}
            >
              {t("users.btn_cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {user ? t("users.btn_save") : t("users.btn_create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
