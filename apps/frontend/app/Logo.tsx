import Image from "next/image";
import logo from "@/public/logo.svg";

export function Logo() {
  return (
    <div className="flex h-10 md:h-12 items-center opacity-90 justify-center shrink-0 bg-base-300">
      <div className="flex items-center gap-1">
        <Image
          src={logo}
          width={25}
          height={25}
          alt="Convy logo"
          draggable={false}
          className="select-none opacity-90 pointer-events-none"
        />
        <h1 className={`text-2xl mb-1 items-center font-light text-base-content`}>
          convy
        </h1>
      </div>
    </div>
  );
}
