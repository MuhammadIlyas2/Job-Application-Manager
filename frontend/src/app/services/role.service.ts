// src/app/services/role.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roles = [
    { name: 'Frontend Developer', color: '#61dafb' },
    { name: 'Backend Developer', color: '#4dc0b5' },
    { name: 'Data Scientist', color: '#9f7aea' },
    { name: 'DevOps Engineer', color: '#f6993f' },
    { name: 'Product Manager', color: '#38c172' }
  ];

  getRoles() {
    return this.roles;
  }

  getRoleColor(roleName: string): string {
    const role = this.roles.find(r => r.name === roleName);
    return role ? role.color : '#cccccc';
  }
}