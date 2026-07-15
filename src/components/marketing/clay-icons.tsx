import Image from "next/image";

type StepIconProps = {
  label: string;
};

function ClayStepImage({ src, label }: { src: string; label: string }) {
  return (
    <span className="clayIconMedia">
      <Image src={src} alt="" width={112} height={112} aria-hidden className="clayIconImg" />
      <span className="srOnly">{label}</span>
    </span>
  );
}

export function ClayAccountIcon({ label }: StepIconProps) {
  return <ClayStepImage src="/brand/steps/account.webp" label={label} />;
}

export function ClayVerifyIcon({ label }: StepIconProps) {
  return <ClayStepImage src="/brand/steps/verify.webp" label={label} />;
}

export function ClayRequestIcon({ label }: StepIconProps) {
  return <ClayStepImage src="/brand/steps/request.webp" label={label} />;
}
