!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

Var Dialog
Var Label
Var CheckboxNmap

Function nmapInstallPage
  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 40u "This application requires Nmap to function properly. Please ensure Nmap is installed on your system."
  Pop $Label

  ${NSD_CreateCheckbox} 0 50 100% 10u "I have installed Nmap or will install it after this installation"
  Pop $CheckboxNmap

  nsDialogs::Show
FunctionEnd

Function nmapInstallPageLeave
  ${NSD_GetState} $CheckboxNmap $0
  ${If} $0 == 0
    MessageBox MB_ICONEXCLAMATION|MB_OK "Please confirm that you will install Nmap. You can download it from https://nmap.org/download.html"
    Abort
  ${EndIf}
FunctionEnd

!macro customInit
  ; Check multiple registry paths for Nmap
  ReadRegStr $R0 HKLM "SOFTWARE\Nmap" ""
  ${If} $R0 == ""
    ReadRegStr $R0 HKLM "SOFTWARE\WOW6432Node\Nmap" ""
    ${If} $R0 == ""
      ; Check if nmap is in PATH
      nsExec::ExecToStack 'cmd /c where nmap'
      Pop $0
      Pop $1
      ${If} $0 != 0
        MessageBox MB_OK|MB_ICONINFORMATION "This application requires Nmap to function properly.$\n$\nPlease download and install Nmap from:$\nhttps://nmap.org/download.html$\n$\nThe installer will continue, but the application won't work until Nmap is installed."
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  ; Verify Nmap installation
  ReadRegStr $R0 HKLM "SOFTWARE\Nmap" ""
  ${If} $R0 == ""
    ReadRegStr $R0 HKLM "SOFTWARE\WOW6432Node\Nmap" ""
    ${If} $R0 == ""
      ; Check if nmap is in PATH
      nsExec::ExecToStack 'cmd /c where nmap'
      Pop $0
      Pop $1
      ${If} $0 != 0
        MessageBox MB_OK|MB_ICONEXCLAMATION "Nmap installation could not be verified. The application may not work properly."
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!macro customPageAfterInstall
  Page custom nmapInstallPage nmapInstallPageLeave
!macroend 