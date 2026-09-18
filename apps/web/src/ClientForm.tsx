import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Briefcase,
  CalendarDays,
  Camera,
  ChevronRight,
  Copy,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  clientSchema,
  type ClientInput,
} from "../../../packages/contracts/src/index";
import { api, useData, useWrite } from "./api";
import {
  Back,
  FormError,
  Loading,
  Modal,
  PageHeading,
  Panel,
  Submit,
  useAuth,
  useToast,
} from "./components";
const steps = [
  "Basic Information",
  "Additional Details",
  "Financial Profile",
  "Preferences",
  "Review",
];
export default function ClientForm() {
  const { id } = useParams(),
    user = useAuth(),
    navigate = useNavigate(),
    toast = useToast(),
    existing = useData("/clients/" + id, !!id),
    write = useWrite();
  const draftKey = `parvath-draft-${user.organizationId}-${user.userId}`;
  const [step, setStep] = useState(0),
    [photo, setPhoto] = useState<File>(),
    [duplicate, setDuplicate] = useState(false),
    [duplicateReason, setDuplicateReason] = useState(""),
    [copy, setCopy] = useState(false),
    [recovered, setRecovered] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      kind: "Individual",
      source: "Direct",
      gender: "",
      preferredContact: "",
      allowDuplicate: false,
    },
  });
  const {
    register,
    watch,
    reset,
    trigger,
    handleSubmit,
    formState: { errors },
    setValue,
  } = form;
  const kind = watch("kind");
  useEffect(() => {
    if (existing.data) {
      const c = existing.data.data;
      reset({
        ...c,
        dob: c.dob?.slice(0, 10) || "",
        registrationNumber: c.business?.registrationNumber || "",
        industry: c.business?.industry || "",
      });
    } else if (!id) {
      try {
        const d = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (d) {
          reset(d);
          setRecovered(true);
        }
      } catch {
        /* Ignore obsolete draft */
      }
    }
  }, [existing.data, id, reset, draftKey]);
  useEffect(() => {
    if (id) return;
    const s = watch((v) => localStorage.setItem(draftKey, JSON.stringify(v)));
    return () => s.unsubscribe();
  }, [watch, draftKey, id]);
  const submit = handleSubmit(async (values) => {
    try {
      const result = await write.mutateAsync({
        path: id ? "/clients/" + id : "/clients",
        method: id ? "PATCH" : "POST",
        body: { ...values, allowDuplicate: duplicate, duplicateReason },
      });
      localStorage.removeItem(draftKey);
      if (photo) {
        const body = new FormData();
        body.append("file", photo);
        body.append("purpose", "Photo");
        try {
          await api(`/clients/${result.data.id}/documents`, {
            method: "POST",
            body,
          });
        } catch (e) {
          toast("Client saved. Photo upload: " + (e as Error).message);
        }
      }
      toast(id ? "Client details updated" : "Client created successfully");
      navigate("/clients/" + result.data.id);
    } catch (e) {
      if ((e as any).status === 409 && Array.isArray((e as any).details))
        setDuplicate(true);
    }
  });
  const next = async () => {
    if (step === 0 && !(await trigger(["name", "phone", "email", "dob"])))
      return;
    setStep(Math.min(4, step + 1));
  };
  const field = (
    name: keyof ClientInput,
    label: string,
    placeholder = "",
    type = "text",
  ) => (
    <label className="field" key={name}>
      {label}
      <span className="input-with-icon">
        {name === "name" ? (
          <UserRound size={18} />
        ) : name === "phone" ? (
          <Phone size={18} />
        ) : name === "email" ? (
          <Mail size={18} />
        ) : name === "dob" ? (
          <CalendarDays size={18} />
        ) : (
          <Briefcase size={18} />
        )}
        <input
          type={type}
          aria-label={label}
          {...register(name as any)}
          placeholder={placeholder}
          aria-invalid={!!errors[name]}
        />
      </span>
      {errors[name] && (
        <small className="field-error">{String(errors[name]?.message)}</small>
      )}
    </label>
  );
  if (id && existing.isPending) return <Loading />;
  return (
    <div className="onboarding">
      <Back />
      <PageHeading
        title={id ? "Edit Client" : "Add New Client"}
        subtitle="Add client details to start managing their financial journey."
      />
      {recovered && (
        <div className="draft-notice">
          Your saved draft has been recovered.
          <button
            className="text-link"
            onClick={() => {
              reset({
                name: "",
                phone: "",
                email: "",
                kind: "Individual",
                gender: "",
                source: "Direct",
                preferredContact: "",
              });
              setRecovered(false);
              localStorage.removeItem(draftKey);
            }}
          >
            Discard draft
          </button>
        </div>
      )}
      <div className="stepper">
        {steps.map((s, i) => (
          <button
            key={s}
            className={step === i ? "current" : step > i ? "done" : ""}
            onClick={() => (i < step ? setStep(i) : void next())}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <div className="onboarding-layout">
          <Panel className="onboarding-main">
            <div className="panel-heading">
              <div>
                <h2>{steps[step]}</h2>
                <p>
                  {step === 0
                    ? "Enter the client's personal and contact details."
                    : step === 4
                      ? "Review the details below before saving."
                      : "Add the details you know. You can update the rest later."}
                </p>
              </div>
              <small>
                All fields marked <b className="required">*</b> are required
              </small>
            </div>
            {step === 0 ? (
              <div className="form-grid">
                {field(
                  "name",
                  kind === "Business" ? "Business Name *" : "Full Name *",
                  kind === "Business"
                    ? "Enter business name"
                    : "Enter full name",
                )}
                {field("phone", "Phone Number *", "+91 90000 00000", "tel")}
                {field(
                  "email",
                  "Email Address",
                  "Enter email address",
                  "email",
                )}
                <fieldset>
                  <legend>Client Type *</legend>
                  <div className="choice-row">
                    <label>
                      <input
                        {...register("kind")}
                        value="Individual"
                        type="radio"
                      />
                      Individual
                    </label>
                    <label>
                      <input
                        {...register("kind")}
                        value="Business"
                        type="radio"
                      />
                      Business
                    </label>
                  </div>
                </fieldset>
                {kind === "Individual" ? (
                  <>
                    {field("dob", "Date of Birth", "", "date")}
                    <fieldset>
                      <legend>Gender</legend>
                      <div className="choice-row">
                        {["Male", "Female", "Other"].map((g) => (
                          <label key={g}>
                            <input
                              {...register("gender")}
                              value={g}
                              type="radio"
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {field("occupation", "Occupation", "Enter occupation")}
                  </>
                ) : (
                  <>
                    {field(
                      "registrationNumber",
                      "Registration Number",
                      "Company / GST registration",
                    )}
                    {field("industry", "Industry", "Enter industry")}
                    <div className="muted">
                      Link existing contact people from the client profile after
                      saving.
                    </div>
                  </>
                )}
                <fieldset>
                  <legend>Preferred Contact Method</legend>
                  <div className="choice-row">
                    {["WhatsApp", "Call", "Email"].map((m) => (
                      <label key={m}>
                        <input
                          type="radio"
                          {...register("preferredContact")}
                          value={m}
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="field full">
                  Address
                  <textarea
                    {...register("address")}
                    placeholder="Enter complete address"
                  />
                </label>
              </div>
            ) : step === 1 ? (
              <div className="form-grid">
                {field("city", "City", "Enter city")}
                {field("state", "State", "Enter state")}
                <label className="field">
                  Source
                  <select {...register("source")}>
                    {[
                      "Direct",
                      "Referral",
                      "Website",
                      "Walk-in",
                      "Campaign",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Tags
                  <input
                    defaultValue={watch("tags")?.join(", ")}
                    onChange={(e) =>
                      setValue(
                        "tags",
                        e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Family, Insurance, Investment"
                  />
                </label>
                <label className="full">
                  Notes
                  <textarea
                    {...register("notesText")}
                    placeholder="Useful context for the relationship"
                  />
                </label>
              </div>
            ) : step === 2 ? (
              <div className="form-grid">
                {field(
                  "annualIncome",
                  "Annual Income / Turnover",
                  "e.g. ₹10–25 Lakhs",
                )}
                <label>
                  Risk Profile
                  <select {...register("riskProfile")}>
                    <option value="">Not assessed</option>
                    {["Conservative", "Moderate", "Growth"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {field(
                  "investmentInterest",
                  "Investment Interests",
                  "e.g. Bonds, Mutual Funds",
                )}
                {field("loanInterest", "Loan Interests", "e.g. Home Loan")}
              </div>
            ) : step === 3 ? (
              <>
                <div className="form-grid">
                  <label>
                    Preferred Contact Method
                    <select {...register("preferredContact")}>
                      <option value="">Not provided</option>
                      <option>WhatsApp</option>
                      <option>Call</option>
                      <option>Email</option>
                    </select>
                  </label>
                </div>
                <div className="tip">
                  <ShieldCheck />
                  <p>
                    A preferred channel is not consent to automated marketing.
                    Record consent and its evidence separately from the client
                    profile or Engagement screen.
                  </p>
                </div>
              </>
            ) : (
              <div className="review-grid">
                {Object.entries(watch())
                  .filter(
                    ([k, v]) =>
                      ![
                        "version",
                        "allowDuplicate",
                        "duplicateReason",
                      ].includes(k) &&
                      v &&
                      typeof v !== "object",
                  )
                  .map(([k, v]) => (
                    <div key={k}>
                      <span>{k.replace(/([A-Z])/g, " $1")}</span>
                      <strong>{String(v)}</strong>
                    </div>
                  ))}
                <button type="button" onClick={() => setStep(0)}>
                  Correct details
                </button>
              </div>
            )}
            <FormError error={write.error} />
            {duplicate && (
              <div className="duplicate-warning">
                <strong>Review possible duplicate</strong>
                <p>
                  A client already shares this phone or email. Confirm this is a
                  distinct person, such as a family member.
                </p>
                <label>
                  Reason for shared contact details
                  <input
                    value={duplicateReason}
                    onChange={(e) => setDuplicateReason(e.target.value)}
                    required
                    minLength={5}
                  />
                </label>
              </div>
            )}
          </Panel>
          <aside>
            <Panel className="photo-panel">
              <div className="photo-placeholder">
                {photo ? (
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="Selected profile photo"
                  />
                ) : (
                  <UserRound size={64} />
                )}
                <span>
                  <Camera size={17} />
                </span>
              </div>
              <h3>Add Profile Photo</h3>
              <p>Helps you recognize your client easily.</p>
              <button type="button" onClick={() => photoInput.current?.click()}>
                <Upload size={17} />
                Upload Photo
              </button>
              <input
                ref={photoInput}
                hidden
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setPhoto(e.target.files?.[0])}
              />
              <div className="security-note">
                <span className="circle-icon mint">
                  <ShieldCheck size={25} />
                </span>
                <div>
                  <strong>Client data is safe and secure</strong>
                  <p>
                    Files remain private and are quarantined until scanning
                    completes.
                  </p>
                </div>
              </div>
            </Panel>
            <Panel title="Quick Add">
              <Link className="quick-add-row" to="/clients/import">
                <span className="product-icon mint">
                  <UserPlus />
                </span>
                <div>
                  <strong>Import from Contacts</strong>
                  <small>Upload a CSV exported from your contacts</small>
                </div>
                <ChevronRight size={16} />
              </Link>
              <button
                className="quick-add-row"
                type="button"
                onClick={async () => {
                  if (await trigger(["name", "phone", "email"])) setStep(4);
                }}
              >
                <span className="product-icon mint">
                  <UserRound />
                </span>
                <div>
                  <strong>Add with Minimal Details</strong>
                  <small>You can update the rest later</small>
                </div>
                <ChevronRight size={16} />
              </button>
              <button
                className="quick-add-row"
                type="button"
                onClick={() => setCopy(true)}
              >
                <span className="product-icon mint">
                  <Copy />
                </span>
                <div>
                  <strong>Duplicate Existing Client</strong>
                  <small>Copy reviewed contact fields only</small>
                </div>
                <ChevronRight size={16} />
              </button>
            </Panel>
          </aside>
        </div>
        <div className="form-footer">
          <Link className="button" to="/clients">
            Cancel
          </Link>
          <div>
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                className="primary"
                type="button"
                onClick={() => void next()}
              >
                Next: {steps[step + 1]} <ChevronRight size={18} />
              </button>
            ) : (
              <Submit busy={write.isPending}>
                {id ? "Save Changes" : "Create Client"}
              </Submit>
            )}
          </div>
        </div>
      </form>
      {copy && (
        <CopyContact
          onClose={() => setCopy(false)}
          onChoose={(c) => {
            reset({
              name: "",
              phone: c.phone,
              email: c.email,
              kind: c.kind,
              address: c.address,
              city: c.city,
              state: c.state,
              source: "Direct",
              preferredContact: "",
            });
            setCopy(false);
            setStep(0);
            toast(
              "Contact fields copied. Enter the distinct client name and review shared details.",
            );
          }}
        />
      )}
    </div>
  );
}
function CopyContact({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (c: any) => void;
}) {
  const q = useData("/clients?limit=100");
  return (
    <Modal title="Copy contact fields" onClose={onClose}>
      <p>
        Choose a source. Only phone, email, address and client type are copied.
        Enter a new name and review duplicates before saving.
      </p>
      <div className="copy-list">
        {q.data?.data.map((c: any) => (
          <button key={c.id} onClick={() => onChoose(c)}>
            {c.name}
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
