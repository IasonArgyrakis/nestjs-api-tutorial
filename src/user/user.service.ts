import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto';
import { Prisma } from '@prisma/client';
import { CreateDepartmentDto } from '../department/dto';
import { RegisterAuthDto } from '../auth/dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        afm: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        departments: {
          select: {
            department: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
      // @todo Paginate
      // skip: 4,
      // take: 2,
    });
  }
  async serializedUsers() {
    try {
      const users: Array<any> =
        await this.getUsers();
      return users.map((user) => {
        user.departments = user.departments.map(
          (department) => {
            department = department.department;
            return department;
          },
        );
        return user;
      });
    } catch (e) {
      this.errorHandler(e);
    }
  }

  async createUser(dto: RegisterAuthDto) {
    try {
      return await this.authService.createUser(
        dto,
      );
    } catch (e) {
      console.log(e);

      this.errorHandler(e);
    }
  }

  async editUser(dto: UserDto) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: dto.id,
        },
        data: {
          ...dto,
        },
      });

      delete user.hash;

      return user;
    } catch (error) {
      this.errorHandler(error);
    }
  }
  async deleteUser(dto: UserDto) {
    try {
      const user = await this.prisma.user.delete({
        where: {
          id: dto.id,
        },
      });

      return user;
    } catch (error) {
      this.errorHandler(error);
    }
  }

  async findUser(userId: number) {
    const user = await this.prisma.user.findFirst(
      {
        where: {
          id: userId,
        },
      },
    );

    delete user.hash;

    return user;
  }

  errorHandler(error) {
    console.log(error);
    const errorMsg = {
      errors: undefined,
      cause: undefined,
    };
    if (error.meta?.target) {
      errorMsg.errors = error.meta.target.reduce(
        (accumulator, value) => {
          return {
            ...accumulator,
            [value]: 'already used',
          };
        },
        {},
      );
    }
    if (error.meta?.cause) {
      errorMsg.cause = error.meta.cause;
    }

    if (error.code === 'P2003') {
      throw new HttpException(
        { ...errorMsg },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (error.code === 'P2025') {
      throw new HttpException(
        { ...errorMsg },
        HttpStatus.NOT_FOUND,
      );
    }
    if (error.code === 'P2002') {
      throw new HttpException(
        { ...errorMsg },
        HttpStatus.FOUND,
      );
    }
    throw error;
  }
}
