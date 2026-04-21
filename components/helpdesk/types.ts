export type View =
  | "/"
  | "/lapor"
  | "/survei"
  | "/admin"

export type ShowToastFn = (
  message: string,
  type?: "success" | "error",
  action?: { label: string; onClick: () => void },
) => void
